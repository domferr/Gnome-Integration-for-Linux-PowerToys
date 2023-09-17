import { icon_new_for_string, Settings } from '@gi-types/gio2';
import { MetaInfo, TYPE_BOOLEAN } from '@gi-types/gobject2';
import { Icon } from '@gi-types/st1';
import { registerGObjectClass } from '@linuxpowertoys/utils/gjs';
import { _, getCurrentExtension, getCurrentExtensionSettings, logger } from '@linuxpowertoys/utils/shell';

const { PopupSwitchMenuItem, PopupSeparatorMenuItem } = imports.ui.popupMenu;
const { Button: PopupMenuButton } = imports.ui.panelMenu;

const debug = logger('indicator');

@registerGObjectClass
export class Indicator extends PopupMenuButton {
  static metaInfo: MetaInfo = {
    GTypeName: 'SettingsButton',
    Signals: {
      'item-selected': {},
      'menu-state-changed': {
        param_types: [TYPE_BOOLEAN],
        accumulator: 0,
      },
    },
  };

  private settings: Settings;
  private icon: Icon;
  private onToggle: () => void;

  constructor(onToggle: () => void) {
    super(0.5, 'Linux PowerToys Indicator', false);

    this.onToggle = onToggle;
    this.settings = getCurrentExtensionSettings();

    this.icon = new Icon({
      gicon: icon_new_for_string(`${getCurrentExtension().path}/icons/indicator.svg`),
      style_class: 'system-status-icon indicator-icon',
    });

    this.add_child(this.icon);

    const switchMenuItem = new PopupSwitchMenuItem(_('Incognito Mode'), false);

    switchMenuItem.connect('toggled', (item) => {
      debug('toggle incognito mode');
    });

    this.menu.addMenuItem(switchMenuItem);
    this.menu.addMenuItem(new PopupSeparatorMenuItem());
  }

  destroy() {
    super.destroy();
  }
}
