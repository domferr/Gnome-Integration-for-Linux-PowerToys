import './styles/stylesheet.css';

import { Settings } from '@gi-types/gio2';
import { Indicator } from '@linuxpowertoys/indicator/indicator';
import { logger } from '@linuxpowertoys/utils/shell';
import {addToStatusArea, getMonitors, Main} from '@linuxpowertoys/utils/ui';
import { getCurrentExtension, getCurrentExtensionSettings } from '@linuxpowertoys/utils/shell';
import { TilingManager } from "@linuxpowertoys/components/tilingManager";
import {Margin} from "@gi-types/clutter10";
import {Rectangle} from "@gi-types/meta10";
import {TileGroup} from "@linuxpowertoys/components/tileGroup";

const debug = logger('extension');

class Extension {
  private settings: Settings;
  private isEnabled = false;
  private indicator: Indicator | null;
  private tilingManager: TilingManager | null;
  private margins: Margin = new Margin({top: 32, left: 32, right: 32, bottom: 32});

  constructor() {
    this.settings = getCurrentExtensionSettings();
    debug('extension is initialized');
  }

  createIndicator() {
    if (this.settings.get_boolean('show-indicator')) {
      this.indicator = new Indicator(() => {});
      addToStatusArea(this.indicator);
    }
  }

  removeIndicator() {
    this.indicator?.destroy();
    this.indicator = null;
  }

  enable(): void {
    this.isEnabled = true;
    this.createIndicator();

    let exampleLayout = new TileGroup({
      tiles: [
        new TileGroup({ perc: 0.2 }),
        new TileGroup({ perc: 0.6 }),
        new TileGroup({ perc: 0.2 }),
      ],
    });

    // @ts-ignore
    Main.layoutManager.connect('startup-complete', () => {
      debug('startup complete: build tiling manager');
      this.tilingManager = new TilingManager();
      this.tilingManager.enable(exampleLayout, this.margins);
    });

    debug('extension is enabled');
  }

  disable(): void {
    this.removeIndicator();
    this.tilingManager?.destroy();
    this.tilingManager = null;
    this.isEnabled = false;
    debug('extension is disabled');
  }
}

export default function (): Extension {
  imports.misc.extensionUtils.initTranslations(getCurrentExtension().metadata.uuid);
  return new Extension();
}
