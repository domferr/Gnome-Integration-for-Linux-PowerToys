import {Rectangle, Window} from '@gi-types/meta10';
import { BlurTilePreview, TilePreview, WINDOW_ANIMATION_TIME } from '@linuxpowertoys/components/tilePreview';
import {logger} from "@linuxpowertoys/utils/shell";
import {TileGroup} from "@linuxpowertoys/components/tileGroup";
import {Widget} from "@gi-types/st1";
import {registerGObjectClass} from "@linuxpowertoys/utils/gjs";
import {global} from "@linuxpowertoys/utils/ui";
import { AnimationMode, Margin } from '@gi-types/clutter10';

const debug = logger('tilingLayout');

@registerGObjectClass
export class TilingLayout extends Widget {
    private _previews: TilePreview[];
    private _showing: boolean;

    layout(layout: TileGroup, workArea: Rectangle, margin: Margin) {
        this._previews?.forEach((preview) => preview.destroy());
        this._previews = this._tileGroupToTilePreviews(workArea, layout, [], margin);
        this._previews.forEach((preview) => preview.open());
    }

    public get showing(): boolean {
        return this._showing;
    }

    openBelow(window: Window) {
        let windowActor = window.get_compositor_private();
        if (!windowActor)
            return;

        global.window_group.set_child_below_sibling(this, windowActor as any);
        this.open();
    }

    open() {
        this.show();
        this._showing = true;
        // @ts-ignore
        this.ease({
            x: this.x,
            y: this.y,
            opacity: 255,
            duration: WINDOW_ANIMATION_TIME,
            mode: AnimationMode.EASE_OUT_QUAD,
        });
    }

    close() {
        this._showing = false;
        // @ts-ignore
        this.ease({
            opacity: 0,
            duration: WINDOW_ANIMATION_TIME,
            mode: AnimationMode.EASE_OUT_QUAD,
            onComplete: () => this.hide(),
        });
    }

    getTileBelow(currPointerPos: { x: number; y: number }) {
        for (let i = 0; i < this._previews.length; i++) {
            let preview = this._previews[i];
            const isHovering = currPointerPos.x >= preview.x && currPointerPos.x <= preview.x + preview.width
                && currPointerPos.y >= preview.y && currPointerPos.y <= preview.y + preview.height;
            if (isHovering) return preview;
        }
    }

    _init() {
        super._init();
        global.window_group.add_child(this);
        this.hide();
    }

    _tileGroupToTilePreviews(groupRect: Rectangle, group: TileGroup, previews: TilePreview[], margin: Margin): TilePreview[] {
        if (group.tiles.length == 0) {
            previews.push(new TilePreview(this, groupRect, margin));
            return previews;
        }

        let tmpGroupRect = new Rectangle({
            x: groupRect.x,
            y: groupRect.y,
        });

        group.tiles.forEach((innerGroup, index) => {
            let innerGroupRect = new Rectangle({
                x: tmpGroupRect.x,
                y: tmpGroupRect.y,
                width: group.horizontal ? groupRect.width * innerGroup.perc:groupRect.width,
                height: group.horizontal ? groupRect.height:groupRect.height * innerGroup.perc,
            });
            let innerGroupMargin = new Margin({
                top: margin.top,
                left: margin.left,
                right: margin.right,
                bottom: margin.bottom,
            });
            this._tileGroupToTilePreviews(innerGroupRect, innerGroup, previews, innerGroupMargin);
            tmpGroupRect.x = group.horizontal ? (tmpGroupRect.x+innerGroupRect.width):tmpGroupRect.x;
            tmpGroupRect.y = group.horizontal ? tmpGroupRect.y:(tmpGroupRect.y+innerGroupRect.height);
        })

        return previews;
    }
}