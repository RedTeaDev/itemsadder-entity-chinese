import type * as aj from '../iaentitymodel'

import { tl } from '../util/intl'
import { store } from '../util/store'
import { roundScale, roundToN } from '../util/misc'
import { removeKeyGently } from '../util/misc'
import { generateTree } from '../util/treeGen'
import { CustomError } from '../util/customError'
import { settings } from '../settings'
import { getModelExportFolder } from '../util/utilz'
import type * as bc from '../ui/mods/boneConfig'

interface vanillaAnimationExporterSettings {
}
const loopModeIDs = ['once', 'hold', 'loop']

async function createAnimationFile(
	bones: aj.BoneObject,
	models: aj.ModelObject,
	animations: aj.Animations,
	settings: aj.GlobalSettings,
	variantModels: aj.VariantModels,
	scaleModels: aj.ScaleModels,
	variantTextureOverrides: aj.VariantTextureOverrides,
	variantTouchedModels: aj.variantTouchedModels
): Promise<{ animationFile: string }> {
	let headYOffset = -1.813
	headYOffset += -0.1
	console.log(headYOffset)

	const staticAnimationUuid = store.get('staticAnimationUuid')
	const staticFrame = animations[staticAnimationUuid].frames[0].bones

	fixPivots()

	animations = removeKeyGently(staticAnimationUuid, animations)

	const generatedAnimationData = {
		bones: [],
		animations: [],
		rotationMode: "precise"
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
						frame: animationTreeItem.item.bones[boneName]
					}
				}
			}
			function collectsEffects(animationTreeItem: any) {
				if (animationTreeItem.type === 'layer') {
					return {
						type: 'branch',
						branches: animationTreeItem.items.map((v: any) =>
							collectsEffects(v)
						)
					}
				} else {
					return {
						type: 'leaf',
						index: animationTreeItem.index,
						effects: animationTreeItem.item.effects
					}
				}
			}
			function generateEffectsTree(tree: any): {
				keyframes: object[]
			} {
				if (tree.type === 'branch') {
					let keyframes: object[] = []
					// prettier-ignore
					tree.branches.forEach((v: any)=> {
						if (v.type === 'branch') {
							const t = generateEffectsTree(v)
							t.keyframes.forEach(element => {
								keyframes.push(element)
							});

						} else {
							keyframes.push(v.effects)
						}
					})
					return {
						keyframes: keyframes
					};
				}
			}

			const effectsTmp = generateEffectsTree(collectsEffects(animationTree))
			const effects = {
				sounds: {
					keyframes: []
				},
				particles: {
					keyframes: []
				}
			}
			
			for (const [dummy, effectFrames] of Object.entries(effectsTmp)) {

				effectFrames.forEach(effectFrame => {
					effects.sounds.keyframes.push(effectFrame["sounds"])
					effects.particles.keyframes.push(effectFrame["particles"])
				})
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

								const scale = roundScale(v.frame.scale)
								const vecStr = `${scale.x}-${scale.y}-${scale.z}`

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
									],
									scale_str: vecStr,
									scale: [
										scale.x,
										scale.y,
										scale.z
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
				loopMode: animation.loopMode,
				length: animation.length,
				bones: boneTrees,
				effects: effects
			}

			console.log('Generated animation:', finalAnimation)

			generatedAnimationData.animations.push(finalAnimation);
			// boneTrees is used in the next_frame function
		}

		// Add all bones to the final json
		for (const [boneName, bone] of Object.entries(bones)) {
			
			// Skip hitbox, it's handled after this loop
			if(boneName === "hitbox" || bone.boneType === "hitbox" || bone.boneType === "eyesHeight")
				continue

			let boneData = {
				name: boneName,
				boneType: bone.boneType,
				maxHeadRotX: bone.maxHeadRotX,
				maxHeadRotY: bone.maxHeadRotY,
				parents: [],
				pos: [
					safeGetVec(bone, "position", "x"),
					safeGetVec(bone, "position", "y"),
					safeGetVec(bone, "position", "z")
				],
				rot: [
					safeGetVec(bone, "rotation", "x"),
					safeGetVec(bone, "rotation", "y"),
					safeGetVec(bone, "rotation", "z")
				],
				scales: scaleModels[boneName] !== undefined ? Object.getOwnPropertyNames(scaleModels[boneName]) : ["1-1-1"]
			};

			let parentBone = bone["parent"] as bc.AJGroup;
			while(parentBone != null && parentBone["type"] === "Object3D") {
				// @ts-ignore
				if(parentBone.getGroup() !== undefined) {
					// @ts-ignore
					boneData.parents.push(parentBone.getName());
				}

				parentBone = parentBone["parent"] as bc.AJGroup;
			}

			generatedAnimationData.bones.push(boneData);
		}


		// Hitbox
		{
			let tmp = Group.all.find(x => x["boneType"] === "hitbox")
			if(tmp === undefined)
				tmp = Group.all.find(x => x.name === "hitbox")
			if(tmp !== undefined && tmp.children.length > 0)
			{
				generatedAnimationData["hitbox"] = {
					pos: tmp.children[0]["origin"],
					// @ts-ignore
					size: tmp.children[0].size()
				}
			}
		}
		// EyesHeight
		{
			const tmp = Group.all.find(x => x["boneType"] === "eyesHeight")
			if(tmp !== undefined && tmp.children.length > 0)
			{
				generatedAnimationData["eyes_height"] = {
					height: tmp.children[0]["origin"].y
				}
			}
		}

		generatedAnimationData.rotationMode = settings.iaentitymodel.rotationMode

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

	const modelExportFolder = getModelExportFolder(settings)
	Blockbench.writeFile(modelExportFolder + "/" + ".metadata", {
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
		data.scaleModels,
		data.variantTextureOverrides,
		data.variantTouchedModels
	)

	await exportAnimationFile(generated, data.settings, exporterSettings)

	Blockbench.showQuickMessage(tl('iaentitymodel.popups.successfullyExported'))
}

function fixPivots() {
	
	 Outliner.elements.forEach(function(element) {
		Outliner.selected.length = 0
		Outliner.selected.push(element)
        // @ts-ignore
        origin2geometry()
    })
}

function safeGetVec(obj, key, subKey) {
	if(!obj[key] || obj[key] === undefined || obj[key] === null)
		return 0
	if(!obj[key][subKey] || obj[key][subKey] === undefined || obj[key][subKey] === null)
		return 0
	return obj[key][subKey];
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