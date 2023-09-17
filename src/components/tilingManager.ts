import {Display, Rectangle, SizeChange, Window} from '@gi-types/meta10';
import {logger} from "@linuxpowertoys/utils/shell";
import {TileGroup} from "@linuxpowertoys/components/tileGroup";
import {getMonitors, global, isPointInsideRect, Main} from "@linuxpowertoys/utils/ui";
import {TilingLayout} from "@linuxpowertoys/components/tilingLayout";
import {Margin, ModifierType} from "@gi-types/clutter10";
import {PRIORITY_DEFAULT_IDLE, Source, SOURCE_CONTINUE, SOURCE_REMOVE, timeout_add} from "@gi-types/glib2";
import {SelectionTilePreview, TilePreview} from "@linuxpowertoys/components/tilePreview";

const debug = logger('tilingLayout');

export class TilingManager {
    private readonly _layout: TilingLayout;
    private readonly _selectedTilesPreview: TilePreview;

    private _workArea: Rectangle;

    private _isGrabbingWindow: boolean;
    private _movingWindowTimerDuration: number = 15;
    private _lastCursorPos: {x: number, y: number} = { x:-1, y: -1 };
    private _wasAltPressed: boolean;

    private _movingWindowTimerId: number | null;
    private _workareasChangedId: number | null;

    constructor() {
        this._layout = new TilingLayout();
        this._selectedTilesPreview = new SelectionTilePreview(this._layout);
    }

    enable(layout: TileGroup, margins: Margin) {
        this._selectedTilesPreview.margins = margins;
        const monitor = getMonitors()[0];
        // @ts-ignore
        this._workArea = Main.layoutManager.getWorkAreaForMonitor(monitor.index);
        debug(`work area for monitor ${monitor.index}: ${this._workArea.x} ${this._workArea.y} ${this._workArea.width}x${this._workArea.height}`);

        this._workareasChangedId = global.display.connect('workareas-changed', () => {
            // @ts-ignore
            const newWorkArea: Rectangle = Main.layoutManager.getWorkAreaForMonitor(monitor.index);
            if (newWorkArea != this._workArea) {
                debug(`work area for monitor ${monitor.index}: ${newWorkArea.x} ${newWorkArea.y} ${newWorkArea.width}x${newWorkArea.height}`);
                this._layout.layout(layout, newWorkArea, margins);
                this._workArea = newWorkArea;
            }
        });

        global.display.connect('grab-op-begin', (_display: Display, window: Window) => {
            debug('grab-op-begin of a window');
            this._onWindowGrabBegin(window);
        });

        global.display.connect('grab-op-end', (_display: Display, window: Window) => {
            debug('grab-op-end of a window');
            this._onWindowGrabEnd(window);
        });
    }

    destroy() {
        this._layout.destroy();
        if (this._movingWindowTimerId) {
            Source.remove(this._movingWindowTimerId);
            this._movingWindowTimerId = null;
        }
        if (this._workareasChangedId) {
            global.display.disconnect(this._workareasChangedId);
            this._workareasChangedId = null;
        }
    }

    _onWindowGrabBegin(window: Window) {
        this._isGrabbingWindow = true;
        this._movingWindowTimerId = timeout_add(
            PRIORITY_DEFAULT_IDLE,
            this._movingWindowTimerDuration,
            this._onMovingWindow.bind(this, window)
        );

        const isCtrlPressed = (global.get_pointer()[2] & ModifierType.CONTROL_MASK);
        if (!isCtrlPressed) return;

        this._layout.openBelow(window);
    }

    _onMovingWindow(window: Window) {
        if (!this._isGrabbingWindow) {
            this._movingWindowTimerId = null;
            return SOURCE_REMOVE;
        }

        const isCtrlPressed = global.get_pointer()[2] & ModifierType.CONTROL_MASK;
        if (!isCtrlPressed) {
            if (this._layout.showing) {
                this._layout.close();
                this._selectedTilesPreview.close();
                this._selectedTilesPreview.rect = new Rectangle({ width: 0 });
                debug("hide layout");
            }
            return SOURCE_CONTINUE;
        }
        if (!this._layout.showing) {
            debug("open layout below grabbed window");
            this._layout.openBelow(window);
        }

        const isAltPressed = (global.get_pointer()[2] & ModifierType.MOD1_MASK) != 0;
        const [x, y] = global.get_pointer();
        const currPointerPos = { x, y };
        if (isAltPressed == this._wasAltPressed && currPointerPos.x === this._lastCursorPos.x
            && currPointerPos.y === this._lastCursorPos.y) {
            return SOURCE_CONTINUE;
        }

        this._lastCursorPos = currPointerPos;

        if (isAltPressed == this._wasAltPressed && isPointInsideRect(currPointerPos, this._selectedTilesPreview.rect)) {
            return SOURCE_CONTINUE;
        }

        this._wasAltPressed = isAltPressed;

        const tileBelow = this._layout.getTileBelow(currPointerPos);
        if (!tileBelow) return SOURCE_CONTINUE;

        let selectionRect = tileBelow.rect.copy();
        if (isAltPressed) {
            selectionRect = selectionRect.union(this._selectedTilesPreview.rect);
        }
        this._selectedTilesPreview.openBelow(
            window,
            true,
            selectionRect,
        );
        
        return SOURCE_CONTINUE;
    }

    _onWindowGrabEnd(window: Window) {
        this._isGrabbingWindow = false;
        this._layout.close();
        this._selectedTilesPreview.close();
        if (!window.allows_resize() || !window.allows_move())
            return;
        const isCtrlPressed = (global.get_pointer()[2] & ModifierType.CONTROL_MASK);
        if (!isCtrlPressed) return;

        const windowActor = window.get_compositor_private();
        // @ts-ignore
        windowActor.remove_all_transitions();
        Main.wm._prepareAnimationInfo(
            global.window_manager,
            windowActor,
            window.get_frame_rect().copy(),
            SizeChange.MAXIMIZE
        );

        window.move_frame(
            true,
            this._selectedTilesPreview.innerX,
            this._selectedTilesPreview.innerY
        );
        window.move_resize_frame(
            true,
            this._selectedTilesPreview.innerX,
            this._selectedTilesPreview.innerY,
            this._selectedTilesPreview.innerWidth,
            this._selectedTilesPreview.innerHeight
        );
        this._selectedTilesPreview.rect = new Rectangle({ width: 0 });
    }
}