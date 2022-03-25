import type * as aj from './iaentitymodel'

import { tl, intl } from './util/intl'
// @ts-ignore
import lang_cz from './lang/cz.yaml'
intl.register('cz', lang_cz)
// @ts-ignore
import lang_de from './lang/de.yaml'
intl.register('de', lang_de)
// @ts-ignore
import lang_en from './lang/en.yaml'
intl.register('en', lang_en)
// @ts-ignore
import lang_es from './lang/es.yaml'
intl.register('es', lang_es)
// @ts-ignore
import lang_fr from './lang/fr.yaml'
intl.register('fr', lang_fr)
// @ts-ignore
import lang_it from './lang/it.yaml'
intl.register('it', lang_it)
// @ts-ignore
import lang_ja from './lang/ja.yaml'
intl.register('ja', lang_ja)
// @ts-ignore
import lang_nl from './lang/nl.yaml'
intl.register('nl', lang_nl)
// @ts-ignore
import lang_pl from './lang/pl.yaml'
intl.register('pl', lang_pl)
// @ts-ignore
import lang_pt from './lang/pt.yaml'
intl.register('pt', lang_pt)
// @ts-ignore
import lang_ru from './lang/ru.yaml'
intl.register('ru', lang_ru)
// @ts-ignore
import lang_sv from './lang/sv.yaml'
intl.register('sv', lang_sv)
// @ts-ignore
import lang_zh from './lang/zh.yaml'
intl.register('zh', lang_zh)
// @ts-ignore
import lang_zh_tw from './lang/zh_tw.yaml'
intl.register('zh_tw', lang_zh_tw)

import './lifecycle'
import './rotationSnap'
import './ui/panel/states'
import './ui/dialogs/settings'
import { bus } from './util/bus'
import { store } from './util/store'
import { ERROR } from './util/errors'
import EVENTS from './constants/events'
import { CustomError } from './util/customError'
import { CustomAction } from './util/customAction'
import { format as modelFormat } from './modelFormat'
import { renderAnimation } from './animationRenderer'
import { DefaultSettings, settings } from './settings'
// import { makeArmorStandModel } from './makeArmorStandModel'

import {
	exportRigModels,
	exportTransparentTexture,
} from './exporting'

import {
	computeElements,
	computeModels,
	computeVariantTextureOverrides,
	computeBones,
	computeVariantModels,
	computeScaleModels,
} from './modelComputation'

export const BuildModel = (callback: any, options: any) => {
	if (!IAENTITY.exportInProgress) {
		IAENTITY.exportInProgress = true
		computeAnimationData(callback, options)
			.then(() => {
				IAENTITY.exportInProgress = false
			})
			.catch((e) => {
				IAENTITY.exportInProgress = false
				Blockbench.setProgress(0)
				if (
					e instanceof CustomError &&
					e.options.intentional &&
					e.options.silent
				) {
					// @ts-ignore
					Blockbench.showQuickMessage(
						tl('iaentitymodel.popups.exportCancelled')
					)
					console.log('Intentional Error:', e.message)
					throw e
				} else {
					console.log('Unknown Error:')
					throw e
				}
			})
	} else {
		Blockbench.showQuickMessage(tl('iaentitymodel.popups.exportInProgress'))
		ERROR.IAENTITY_BUSY()
	}
}

async function computeAnimationData(
	callback: (data: any) => any,
	options: any
) {
	console.groupCollapsed('Compute Animation Data')

	const animations = (await renderAnimation(options)) as aj.Animations
	const cubeData: aj.CubeData = computeElements()
	const models: aj.ModelObject = await computeModels(cubeData)
	const variantTextureOverrides = computeVariantTextureOverrides(
		models
	) as aj.VariantTextureOverrides
	const bones = computeBones(models, animations) as aj.BoneObject
	// const [variantModels, variantTouchedModels] = await computeVariantModels(models, variantTextureOverrides)
	const scaleModels = computeScaleModels(bones)
	const variants = (await computeVariantModels(
		models,
		scaleModels,
		variantTextureOverrides
	)) as {
		variantModels: aj.VariantModels
		scaleModels: aj.ScaleModels
		variantTouchedModels: aj.variantTouchedModels
	}

	// const flatVariantModels = {}
	// Object.values(variantModels).forEach(variant => Object.entries(variant).forEach(([k,v]) => flatVariantModels[k] = v))
	// console.log('Flat Variant Models:', flatVariantModels)

	if(!isInternalModel(settings)) {
		await exportRigModels(models, variants.variantModels, scaleModels)
		if (settings.iaentitymodel.transparentTexturePath) {
			await exportTransparentTexture()
		}
	}

	const data = {
		settings: settings.toObject() as aj.GlobalSettings,
		cubeData,
		bones,
		models,
		scaleModels,
		variantTextureOverrides,
		variantModels: variants.variantModels,
		variantTouchedModels: variants.variantTouchedModels,
		animations,
	}
	console.groupEnd()
	console.groupCollapsed('Exporter Output')
	await callback(data)
	console.groupEnd()
}

import './pluginDefinitions'
import { show_settings } from './ui/dialogs/settings'
import { show_about } from './ui/dialogs/about'

const menu: any = new BarMenu(
	'iaentitymodel',
	[],
	() => Format.id === modelFormat.id
)
menu.label.style.display = 'none'
document.querySelector('#menu_bar').appendChild(menu.label)

let prevAnimationTabTitle = "ANIMATIONS";
function hideEditPaintTabs() {
	// @ts-ignore // Hide the texture editor tab
	document.querySelector("#mode_selector > li:nth-child(2)").style.display = "none"
	// @ts-ignore
	document.querySelector("div.tool.resize_tool").style.display = "none"
	// @ts-ignore
	document.querySelector("div.tool.pivot_tool").style.display = "none"

	// @ts-ignore
	if(Modes.options.edit.selected) {
		// @ts-ignore // Hide the add cube button
		document.querySelector("#outliner > div > div > div > div.content > div.tool.add_cube").style.display = "none"
		// @ts-ignore // Hide the textures bottom left panel
		document.querySelector("#textures").style.display = "none"
		// @ts-ignore // Hide the UV bottom left panel
		document.querySelector("#uv").style.display = "none"

		// @ts-ignore
		prevAnimationTabTitle = document.querySelector("#animations > h3 > label").innerText
		// @ts-ignore
		document.querySelector("#animations > h3 > label").innerText = "PLAYER EMOTES"
	}
}

function restoreEditPaintTabs() {
	// @ts-ignore // Show the texture editor tab
	document.querySelector("#mode_selector > li:nth-child(2)")?.style.removeProperty("display")
	// @ts-ignore
	document.querySelector("div.tool.resize_tool")?.style.removeProperty("display")
	// @ts-ignore
	document.querySelector("div.tool.pivot_tool")?.style.removeProperty("display")

	// @ts-ignore
	if(Modes.options.edit.selected) {
		// @ts-ignore // Show the add cube button
		document.querySelector("#outliner > div > div > div > div.content > div.tool.add_cube")?.style.removeProperty("display")
		// @ts-ignore // Show the textures bottom left panel
		document.querySelector("#textures")?.style.removeProperty("display")
		// @ts-ignore // Show the UV bottom left panel
		document.querySelector("#uv")?.style.removeProperty("display")

		// @ts-ignore
		document.querySelector("#animations > h3 > label").innerText = prevAnimationTabTitle
	}
}

// @ts-ignore
Blockbench.on('select_project', () => {
	queueMicrotask(() => {
		console.log('selected', Format.id !== modelFormat.id)
		menu.label.style.display = Format.id !== modelFormat.id ? 'none' : 'inline-block'

		// Set the current projectName
		if(settings.iaentitymodel.projectName === undefined || settings.iaentitymodel.projectName === "")
			settings.iaentitymodel.projectName = safeFunctionName(Project.name)

		if(Format.id === modelFormat.id) {
			refreshIcons()
			// Hide the "variable placeholders" panel under the keyframe coords 
			// @ts-ignore
			Interface.Panels.variable_placeholders.node.style.visibility = "hidden"

			if(isInternalModel(settings)) {
				// @ts-ignore
				Modes.options.animate.select()
				hideEditPaintTabs()
			}
			else {
				// @ts-ignore
				Modes.options.edit.select()
				restoreEditPaintTabs()
			}
		}
		else {
			// Show the "variable placeholders" panel under the keyframe coords
			// @ts-ignore
			Interface.Panels.variable_placeholders.node.style.visibility = "visible"

			// @ts-ignore
			Modes.options.edit.select()
			restoreEditPaintTabs()
		}
	})
})
// @ts-ignore
Blockbench.on('add_group', () => {
	if(Format.id === modelFormat.id) {
		refreshIcons()
	}
})
// @ts-ignore
Blockbench.on('group_elements', () => {
	if(Format.id === modelFormat.id) {
		refreshIcons()
	}
})
// @ts-ignore
Blockbench.on('add_cube', () => {
	if(Format.id === modelFormat.id) {
		refreshIcons()

		if(isInternalModel(settings)) {
			alert("This is not currently supported. You can only add bones and mark them to `locator`. Please delete the cube.")
		}
	}
})

Blockbench.on('select_mode', () => {
	refreshIcons()
	if(isInternalModel(settings)) {
		hideEditPaintTabs()
	}
	else {
		restoreEditPaintTabs()
	}
})

// Dirty
document.body.addEventListener('click', () => {
	refreshIcons()
}, true);

// @ts-ignore
Blockbench.on('unselect_project', () => {
	menu.label.style.display = 'none'
})
// @ts-ignore
import logo from './assets/itemsadder_icon.png'
import {isInternalModel, refreshIcons} from './util/utilz'
import { safeFunctionName } from './util/replace'
menu.label.innerHTML = tl('iaentitymodel.menubar.dropdown')
let img = document.createElement('img')
img.src = logo
img.width = 16
img.height = 16
img.style.position = 'relative'
img.style.top = '2px'
img.style.borderRadius = '8px'
img.style.marginRight = '5px'
menu.label.prepend(img)

MenuBar.addAction(
	CustomAction('iaentitymodel_settings', {
		icon: 'settings',
		category: 'iaentitymodel',
		name: tl('iaentitymodel.menubar.settings'),
		condition: () => modelFormat.id === Format.id && !isInternalModel(settings),
		click: function () {
			show_settings()
		},
	}),
	'iaentitymodel'
)
MenuBar.addAction(
	{
		// @ts-ignore
		name: tl('iaentitymodel.menubar.export'),
		id: 'iaentitymodel.export',
		icon: 'insert_drive_file',
		condition: () => modelFormat.id === Format.id,
		click: () => {
			// Call the selected exporter.
			// @ts-ignore
			store.getStore('exporters').get("vanillaAnimationExporter")()
		},
		keybind: new Keybind({
			key: 120, // f9
		}),
	},
	'iaentitymodel'
)
MenuBar.addAction(
	CustomAction('iaentitymodel_about', {
		icon: 'help',
		category: 'iaentitymodel',
		name: tl('iaentitymodel.menubar.about'),
		condition: () => modelFormat.id === Format.id,
		click: function () {
			show_about()
		},
	}),
	'iaentitymodel'
)
MenuBar.update()
const cb = () => {
	store.set('states', { default: {} })
	settings.update(DefaultSettings, true)
	bus.dispatch(EVENTS.LIFECYCLE.LOAD_MODEL, {})
}
Blockbench.on('new_project', cb)
bus.on(EVENTS.LIFECYCLE.CLEANUP, () => {
	menu.label.remove()
	// @ts-ignore
	Blockbench.removeListener('new_project', cb)
	// @ts-ignore
	Blockbench.removeListener('select_mode', cb)
})


new Property(KeyframeDataPoint, 'string', 'name', {label: "Name", condition: point => Format.id === modelFormat.id && ['particle', 'sound'].includes(point.keyframe.channel), default: "minecraft:XXXXX"},);
new Property(KeyframeDataPoint, 'number', 'volume', {label: "Volume", condition: point => Format.id === modelFormat.id && 'sound' == point.keyframe.channel, default: 1},);
new Property(KeyframeDataPoint, 'number', 'pitch', {label: "Pitch", condition: point => Format.id === modelFormat.id && 'sound' == point.keyframe.channel, default: 1});

new Property(KeyframeDataPoint, 'string', 'locator_name', {label: "Bone (locator)", condition: point => Format.id === modelFormat.id && 'particle' == point.keyframe.channel, default: "locator_bone_name"} );
new Property(KeyframeDataPoint, 'number', 'speed', {label: "Speed", condition: point => Format.id === modelFormat.id && 'particle' == point.keyframe.channel, default: 1});
new Property(KeyframeDataPoint, 'number', 'count', {label: "Count", condition: point => Format.id === modelFormat.id && 'particle' == point.keyframe.channel, default: 1});
new Property(KeyframeDataPoint, 'molang', 'x_delta', { label: 'X delta', condition: point => Format.id === modelFormat.id && 'particle' == point.keyframe.channel, default: 0 });
new Property(KeyframeDataPoint, 'molang', 'y_delta', { label: 'Y delta', condition: point => Format.id === modelFormat.id && 'particle' == point.keyframe.channel, default: 0 });
new Property(KeyframeDataPoint, 'molang', 'z_delta', { label: 'Z delta', condition: point => Format.id === modelFormat.id && 'particle' == point.keyframe.channel, default: 0 });

// Edit the Bedrock effect animator "script", "locator", "file" properties condition to hide itself if this project has our custom model format
KeyframeDataPoint["properties"].effect.condition = (point) => { Format.id !== modelFormat.id && ['particle', 'timeline'].includes(point.keyframe.channel) }
KeyframeDataPoint["properties"].script.condition = (point) => { Format.id !== modelFormat.id && ['particle', 'timeline'].includes(point.keyframe.channel) }
KeyframeDataPoint["properties"].locator.condition = (point) => { Format.id !== modelFormat.id && 'particle' == point.keyframe.channel }
KeyframeDataPoint["properties"].file.condition = (point) => { Format.id !== modelFormat.id && ['particle', 'timeline'].includes(point.keyframe.channel) }

