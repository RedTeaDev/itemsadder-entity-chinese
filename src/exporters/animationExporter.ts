import type * as aj from '../iaentitymodel'

import * as fs from 'fs'
import { tl } from '../util/intl'
import { Path } from '../util/path'
import { store } from '../util/store'
import { roundToN } from '../util/misc'
import { removeKeyGently } from '../util/misc'
import { generateTree } from '../util/treeGen'
import { CustomError } from '../util/customError'
import {
	safeFunctionName,
	format,
	fixIndent,
	safeEntityTag,
} from '../util/replace'
import { Object3D, Scene } from 'three'
import { settings } from '../settings'

interface vanillaAnimationExporterSettings {
	itemsadderItemConfigPath: string | undefined
}

interface MCBConfig {
	dev: boolean
	header: string
	generatedDirectory: string
	rootNamespace?: string
	defaultNamespace?: string
	[index: string]: any
}

const loopModeIDs = ['once', 'hold', 'loop']

async function createAnimationFile(
	bones: aj.BoneObject,
	models: aj.ModelObject,
	animations: aj.Animations,
	settings: aj.GlobalSettings,
	variantModels: aj.VariantModels,
	variantTextureOverrides: aj.VariantTextureOverrides,
	variantTouchedModels: aj.variantTouchedModels
): Promise<{ animationFile: string }> {
	const ajSettings = settings.iaentitymodel
	const exporterSettings: vanillaAnimationExporterSettings =
		settings.vanillaAnimationExporter
	const projectName = safeFunctionName(ajSettings.projectName)

	let headYOffset = -1.813
	/*if (!exporterSettings.markerArmorStands)*/ headYOffset += -0.1
	console.log(headYOffset)

	const staticAnimationUuid = store.get('staticAnimationUuid')
	const staticFrame = animations[staticAnimationUuid].frames[0].bones

	animations = removeKeyGently(staticAnimationUuid, animations)
	console.log(animations)

	const generatedAnimationData = {
		vanilla_material: "potion",
		bones: [],
		animations: []
	};

	{
		if (!Object.keys(animations).length) {
			throw new CustomError('No Animations Error', {
				intentional: true,
				dialog: {
					id: 'iaentitymodel.exporters.vanillaAnimation.dialogs.errors.noAnimations',
					title: tl(
						'iaentitymodel.exporters.vanillaAnimation.dialogs.errors.noAnimations.title'
					),
					lines: [
						tl(
							'iaentitymodel.exporters.vanillaAnimation.dialogs.errors.noAnimations.body'
						),
					],
					width: 512 + 128,
					singleButton: true,
				},
			})
		}

		for (const animation of Object.values(animations)) {
			if (animation.frames.length <= 1) {
				throw new CustomError('Zero Length Animation Error', {
					intentional: true,
					dialog: {
						id: 'iaentitymodel.exporters.vanillaAnimation.dialogs.errors.zeroLengthAnimation',
						title: tl(
							'iaentitymodel.exporters.vanillaAnimation.dialogs.errors.zeroLengthAnimation.title'
						),
						lines: [
							tl(
								'iaentitymodel.exporters.vanillaAnimation.dialogs.errors.zeroLengthAnimation.body',
								{
									animationName: animation.name,
								}
							),
						],
						width: 512,
						singleButton: true,
					},
				})
			}

			const touchedBones = Object.keys(animation.frames[0].bones)

			console.log('Animation:', animation)
			const animationTree = generateTree(animation.frames)
			console.log('Animation Tree:', animationTree)

			function collectBoneTree(boneName: string, animationTreeItem: any) {
				if (animationTreeItem.type === 'layer') {
					return {
						type: 'branch',
						branches: animationTreeItem.items.map((v: any) =>
							collectBoneTree(boneName, v)
						),
						min: animationTreeItem.min,
						max: animationTreeItem.max,
					}
				} else {
					return {
						type: 'leaf',
						index: animationTreeItem.index,
						frame: animationTreeItem.item.bones[boneName],
					}
				}
			}

			const boneTrees = {}
			for (const [boneName, bone] of Object.entries(bones)) {
				if (!touchedBones.includes(boneName)) continue
				const tree = collectBoneTree(boneName, animationTree)
				console.log('Bone Tree:', tree)
				function generateBaseTree(tree: any): {
					keyframes: object[]
				} {
					if (tree.type === 'branch') {
						let keyframes: object[] = []
						// prettier-ignore
						tree.branches.forEach((v: any)=> {
							if (v.type === 'branch') {
								const t = generateBaseTree(v)
								t.keyframes.forEach(element => {
									keyframes.push(element)
								});

							} else {
								let pos = v.frame.pos
								pos = {
									x: roundToN(pos.x, 10000),
									y: roundToN(pos.y + headYOffset, 10000),
									z: roundToN(pos.z, 10000)
								}
								let rot = v.frame.rot
								rot = {
									x: roundToN(rot.x, 10000),
									y: roundToN(rot.y, 10000),
									z: roundToN(rot.z, 10000)
								}
								// prettier-ignore
								keyframes.push({
									pos: [
										pos.x,
										pos.y,
										pos.z
									],
									rot: [
										rot.x,
										rot.y,
										rot.z
									]
								})
							}
						})
						return {
							keyframes: keyframes
						};
					}
				}
				boneTrees[boneName] = generateBaseTree(tree)
			}

			const finalAnimation = {
				name: animation.name,
				maxDistance: animation.maxDistance,
				loopMode: animation.maxDistance,
				bones: boneTrees
			}

			console.log('Generated animation:', finalAnimation)

			generatedAnimationData.animations.push(finalAnimation);
			// boneTrees is used in the next_frame function
		}

		for (const [boneName, bone] of Object.entries(bones)) {

////// This should not be needed. 
			// I have to do that shit since I can't assign bone to currBone.
			let pos = [
				bone["position"]["x"],
				bone["position"]["y"],
				bone["position"]["z"]
			];
			let rot = [
				bone["rotation"]["x"],
				bone["rotation"]["y"],
				bone["rotation"]["z"]
			];
			
			// Adds parents pos and rot to the final bone
			let parentBone = bone["parent"];
			while(parentBone != null && parentBone["type"] == "Object3D")
			{
				console.log("TEST: parent of", bone)
				console.log("TEST: parent", parentBone)

				pos = [
					pos[0] + parentBone["position"]["x"],
					pos[1] + parentBone["position"]["y"],
					pos[2] + parentBone["position"]["z"]
				];
				rot = [
					rot[0] + parentBone["rotation"]["x"],
					rot[1] + parentBone["rotation"]["y"],
					rot[2] + parentBone["rotation"]["z"]
				];
				parentBone = parentBone["parent"];
			}

			generatedAnimationData.bones.push({
					name: boneName,
					custom_model_data: bone.customModelData,
					pos: pos,
					rot: rot
			});

			/*generatedAnimationData.bones.push({
				name: boneName,
				custom_model_data: bone.customModelData,
				pos: [
					bone["position"]["x"],
					bone["position"]["y"],
					bone["position"]["z"],
				],
				rot: [
					bone["rotation"]["x"],
					bone["rotation"]["y"],
					bone["rotation"]["z"]
				]
			});*/
		};
		
////// This should not be needed. Keep this commented here just in case.
		/*for (const [modeName, model] of Object.entries(models)) {
			finished.bones.push({
					name: modeName,
					custom_model_data: model["aj"]["customModelData"],
					pos: model["origin_pos"],
					rot: model["origin_rot"]
			});
		};

		finished["models"] = models;
		*/

		console.log("Finished: ", generatedAnimationData);
	}

	return { animationFile: JSON.stringify(generatedAnimationData) }
}

async function exportAnimationFile(
	generated: { animationFile: string; },
	ajSettings: aj.GlobalSettings,
	exporterSettings: vanillaAnimationExporterSettings
) {
	console.log("settings", settings)

	if (!settings.iaentitymodel.itemsadderItemConfigPath) {
		throw new CustomError(
			'iaentitymodel.exporters.generic.dialogs.errors.itemsadderItemConfigPathNotDefined',
			{
				intentional: true,
				dialog: {
					id: 'iaentitymodel.exporters.generic.dialogs.errors.itemsadderItemConfigPathNotDefined',
					title: tl(
						'iaentitymodel.exporters.generic.dialogs.errors.itemsadderItemConfigPathNotDefined.title'
					),
					lines: [
						tl(
							'iaentitymodel.exporters.generic.dialogs.errors.itemsadderItemConfigPathNotDefined.body'
						),
					],
					width: 512,
					singleButton: true,
				},
			}
		)
	}

	//TODO export also the itemsadder yml animation.


	let path = settings.iaentitymodel.itemsadderItemConfigPath + "/" + settings.iaentitymodel.projectName ;
	if (!fs.existsSync(path))
		fs.mkdirSync(path, { recursive: true });

	Blockbench.writeFile(path + "/" + settings.iaentitymodel.projectName + ".ia_entity", {
		content: generated.animationFile,
		custom_writer: null,
	})
}

async function animationExport(data: any) {
	const exporterSettings: vanillaAnimationExporterSettings =
		data.settings.vanillaAnimationExporter
	const generated = await createAnimationFile(
		data.bones,
		data.models,
		data.animations,
		data.settings,
		data.variantModels,
		data.variantTextureOverrides,
		data.variantTouchedModels
	)

	/*switch (exporterSettings.exportMode) {
		case 'mcb':
			await exportMCFile(generated, data.settings, exporterSettings)
			break
		case 'vanilla':
			await exportDataPack(generated, data.settings, exporterSettings)
			break
	}*/
	await exportAnimationFile(generated, data.settings, exporterSettings)

	Blockbench.showQuickMessage(tl('iaentitymodel.popups.successfullyExported'))
}

const genericEmptySettingText = tl(
	'iaentitymodel.settings.generic.errors.emptyValue'
)

const Exporter = (AJ: any) => {
	AJ.registerExportFunc('vanillaAnimationExporter', function () {
		AJ.build(
			(data: any) => {
				console.log('Input Data:', data)
				animationExport(data)
			},
			{
				generate_static_animation: true,
			}
		)
	})
}
if (Reflect.has(window, 'IAENTITY')) {
	Exporter(window['IAENTITY'])
} else {
	// @ts-ignore
	Blockbench.on('itemsadder-entity-ready', Exporter)
}
