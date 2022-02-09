import type * as aj from '../iaentitymodel'

import { tl } from '../util/intl'
import { store } from '../util/store'
import { roundToN } from '../util/misc'
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
	variantTextureOverrides: aj.VariantTextureOverrides,
	variantTouchedModels: aj.variantTouchedModels
): Promise<{ animationFile: string }> {
	let headYOffset = -1.813
	headYOffset += -0.1
	console.log(headYOffset)

	const staticAnimationUuid = store.get('staticAnimationUuid')
	const staticFrame = animations[staticAnimationUuid].frames[0].bones

	animations = removeKeyGently(staticAnimationUuid, animations)
	console.log(animations)

	const generatedAnimationData = {
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
				loopMode: animation.loopMode,
				length: animation.length,
				bones: boneTrees
			}

			console.log('Generated animation:', finalAnimation)

			generatedAnimationData.animations.push(finalAnimation);
			// boneTrees is used in the next_frame function
		}

		// Add all bones to the final json
		for (const [boneName, bone] of Object.entries(bones)) {
			
			let boneData = {
				name: boneName,
				isHead: bone.isHead,
				parents: [],
				pos: [
					bone["position"]["x"],
					bone["position"]["y"],
					bone["position"]["z"]
				],
				rot: [
					bone["rotation"]["x"],
					bone["rotation"]["y"],
					bone["rotation"]["z"]
				]
			};

			let parentBone = bone["parent"] as bc.AJGroup;
			while(parentBone != null && parentBone["type"] === "Object3D") {
				// @ts-ignore
				if(parentBone.getGroup() !== undefined) {
					// @ts-ignore
					boneData.parents.push(parentBone.getName());
				}

				console.log("TEST: parent of", bone)
				console.log("TEST: parent", parentBone)

				parentBone = parentBone["parent"] as bc.AJGroup;
			}

			console.log("amogus boneData: ", boneData)

			generatedAnimationData.bones.push(boneData);
		}

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
		data.variantTextureOverrides,
		data.variantTouchedModels
	)

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
