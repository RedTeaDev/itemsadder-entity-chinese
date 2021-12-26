import { BuildModel } from './mainEntry'
import { settings } from './settings'
import * as util from './util'
import events from './constants/events'
import { format } from './modelFormat'
import { registerSettingRenderer } from './ui/dialogs/settings'
import './ui/mods/boneConfig'
import './compileLangMC'
const ANIMATED_JAVA = {
	build(callback: Function, configuration: Record<any, any>) {
		const default_configuration = {
			generate_static_animation: false,
		}
		BuildModel(
			callback,
			Object.assign(default_configuration, configuration)
		)
	},
	registerExportFunc(name: string, exportFunc: () => void) {
		util.store.getStore('exporters').set(name, exportFunc)
	},
	settings,
	util,
	store: util.store,
	format: format,
	registerSettingRenderer,
}
delete window['ANIMATED_JAVA']
Object.defineProperty(window, 'ANIMATED_JAVA', {
	value: ANIMATED_JAVA,
})
// window.ANIMATED_JAVA = ANIMATED_JAVA
util.bus.on(events.LIFECYCLE.CLEANUP, () => {
	console.log('CLEANUP')
	// @ts-ignore
	delete window.ANIMATED_JAVA
})

import './exporters/statueExporter'
// @ts-ignore
Blockbench.dispatchEvent('animated-java-ready', ANIMATED_JAVA)
// @ts-ignore
Blockbench.events['animated-java-ready'].length = 0