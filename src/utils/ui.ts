import { Global } from '@gi-types/shell0';
import { _, getCurrentExtension } from '@linuxpowertoys/utils/shell';
import {Rectangle} from "@gi-types/meta10";

export const global = Global.get();
export const Main = imports.ui.main;

export const getMonitors = (): Monitor[] => imports.ui.main.layoutManager.monitors;

export const getMonitorIndexForPointer = () => {
    const [x, y] = global.get_pointer();
    const monitors = getMonitors();

    for (let i = 0; i <= monitors.length; i++) {
        const monitor = monitors[i];

        if (x >= monitor.x && x < monitor.x + monitor.width && y >= monitor.y && y < monitor.y + monitor.height) {
            return i;
        }
    }

    return imports.ui.main.layoutManager.primaryIndex;
};

export const getMonitorConstraint = () =>
    new imports.ui.layout.MonitorConstraint({
        index: getMonitorIndexForPointer(),
    });

export const getMonitorConstraintForIndex = (index: number) =>
    new imports.ui.layout.MonitorConstraint({
        index,
    });


export const addToStatusArea = (button: any) => {
    imports.ui.main.panel.addToStatusArea(getCurrentExtension().metadata.uuid, button, 1, 'right');
};

export const isPointInsideRect = (point: {x: number, y:number }, rect: Rectangle) => {
    return point.x >= rect.x && point.x <= rect.x + rect.width &&
        point.y >= rect.y && point.y <= rect.y + rect.height;
}