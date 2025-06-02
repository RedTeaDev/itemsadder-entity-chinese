import type * as aj from '../iaentitymodel'

import { tl } from '../util/intl'
import { store } from '../util/store'
import { roundScale, roundToN } from '../util/misc'
import { removeKeyGently } from '../util/misc'
import { generateTree } from '../util/treeGen'
import { CustomError } from '../util/customError'
import { settings } from '../settings'
import {getModelExportFolder, getProjectFolder, isInternalModel, needsToExportJsonsModels} from '../util/utilz'
import type * as bc from '../ui/mods/boneConfig'

import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml';

interface vanillaAnimationExporterSettings {
}

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
	console.log('headYOffset', headYOffset)

	const staticAnimationUuid = store.get('staticAnimationUuid')
	const staticFrame = animations[staticAnimationUuid].frames[0].bones

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
				animType: animation["animType"] ? animation["animType"] : "other",
				canPlayerMove: animation.canPlayerMove,
				maxDistance: animation.maxDistance,
				loopMode: animation.loopMode,
				length: animation.length,
				bones: boneTrees,
				effects: effects
			}

			// @ts-ignore
			let markers = Animation.all.find(x => x.name === finalAnimation.name)?.markers
			if(markers) {
				let markerStart;
				let markerEnd;
				markers.forEach(marker => {
					if(marker.color === -1) {
						if(!markerStart) {
							markerStart = marker
						} else if(!markerEnd) {
							markerEnd = marker
							if(markerEnd.time < markerStart.time) {
								let tmp = markerStart
								markerStart = markerEnd
								markerEnd = tmp
							}
						}
					}
				})

				if(markerStart) {
					finalAnimation["loopStartTime"] = markerStart.time
				}
				if(markerEnd) {
					finalAnimation["loopEndTime"] = markerEnd.time
				}
			}
			console.log('Generated animation:', finalAnimation)

			generatedAnimationData.animations.push(finalAnimation);
			// boneTrees is used in the next_frame function
		}

		// Add all bones to the final json
		for (const [boneName, bone] of Object.entries(bones)) {
			
			// Skip hitbox, it's handled after this loop
			if(boneName === "hitbox" || bone.boneType === "hitbox")
				continue

			let scaledPosRot = staticFrame[boneName]

			let boneData = {
				name: boneName,
				boneType: bone.boneType,
				maxHeadRotX: bone.maxHeadRotX,
				maxHeadRotY: bone.maxHeadRotY,
				parents: [],
				pos: [
					roundToN(scaledPosRot.pos.x, 10000),
					roundToN(scaledPosRot.pos.y + headYOffset, 10000),
					roundToN(scaledPosRot.pos.z, 10000)
				],
				rot: [
					roundToN(scaledPosRot.rot.x, 10000),
					roundToN(scaledPosRot.rot.y, 10000),
					roundToN(scaledPosRot.rot.z, 10000)
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
			// Find the first group with boneType "hitbox" or name "hitbox"
			const hitboxGroup = Group.all.find(
				x => (x["boneType"] === "hitbox" || x.name === "hitbox")
			);

			if (hitboxGroup && hitboxGroup.children.length > 0) {
				// Only allow if it's a group, not a cube
				generatedAnimationData["hitbox"] = {
					pos: hitboxGroup.children[0]["origin"],
					// Groups do not have a size method, so skip size if not present
					// Only include size if the child is a group and has a size method
					// @ts-ignore
					size: typeof hitboxGroup.children[0].size === "function"
					// @ts-ignore
						? hitboxGroup.children[0].size()
						: undefined
				};
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

	let extension = ".metadata";
	if(isInternalModel(settings))
	{
		if(needsToExportJsonsModels(settings))
			extension = ".player_advanced_animations";
		else
			extension = ".player_animations";
	}

	Blockbench.writeFile(getModelExportFolder(settings) + "/" + extension, {
		content: generated.animationFile,
		custom_writer: null,
	})

	// Iterate all .yml files in the project folder and check if they contain the custom entity, otherwise generate a new one.
	const projectFolder = getProjectFolder()
	function getAllYmlFiles(dir: string): string[] {
		let results: string[] = [];
		const list = fs.readdirSync(dir);
		list.forEach(function(file) {
			const filePath = path.join(dir, file);
			const stat = fs.statSync(filePath);
			if (stat && stat.isDirectory()) {
				results = results.concat(getAllYmlFiles(filePath));
			} else if (file.endsWith('.yml')) {
				results.push(filePath);
			}
		});
		return results;
	}

	const files = getAllYmlFiles(projectFolder);
	let found = false;
	for (const file of files) {
		const fileContent = fs.readFileSync(file, 'utf8');
		let ymlData;
		try {
			ymlData = yaml.load(fileContent);
		} catch (e) {
			console.warn(`Failed to parse YAML file: ${file}`, e);
			continue;
		}

		if (ymlData && ymlData.info && ymlData.info.namespace === settings.iaentitymodel.namespace) {
			console.log(`File ${file} contains the correct namespace: ${settings.iaentitymodel.namespace}`);

			// Check if the file contains the custom entity
			if (ymlData.entities && ymlData.entities[settings.iaentitymodel.projectName]) {

				console.log(`File ${file} contains the custom entity: ${settings.iaentitymodel.projectName}`);
				found = true;
				break;
			}
		}
	}

	if(!found) {
		const ymlFile = path.join(projectFolder, "custom_entity_" + settings.iaentitymodel.projectName + ".yml");
		const ymlData = {
			info: {
				namespace: settings.iaentitymodel.namespace,
			},
			entities: {
				[settings.iaentitymodel.projectName]: {
					model_folder: "entity/" + settings.iaentitymodel.projectName,
					type: "ZOMBIE",
					can_sun_burn: false,
				}
			}
		};

		fs.writeFileSync(ymlFile, yaml.dump(ymlData), 'utf8');
		console.log(`Created new YML file: ${ymlFile}`);
	}
}

async function animationExport(data: any) {
	// Check if it's inside an ItemsAdder contents sub-folder. Otherwise show a warning about that.
	// Also check if the namespace is the same as the project name, otherwise show a warning about that.
	let projectFolder = getProjectFolder()
	let projectNamespace = settings.iaentitymodel.namespace

	// Example: C:\Progetti\Minecraft\TestServer\1.21.5\plugins\ItemsAdder\contents\test

	const contentsFolderMatch = projectFolder.match(/contents[\/\\]([^\/\\]+)/i)
	if (!contentsFolderMatch) {
		// @ts-ignore
		Blockbench.showMessageBox({
			title: "Export error",
			// tl('iaentitymodel.exporters.vanillaAnimation.dialogs.errors.notInContentsFolder')
			message: "Save the project into an ItemsAdder contents folder before exporting! Example: 'ItemsAdder/contents/test/project.iaentitymodel'",
			icon: 'error'
		})
		console.log("Not in contents folder.", projectFolder)
		return
	}
	const folderNamespace = contentsFolderMatch[1]
	if (folderNamespace !== projectNamespace) {
		// @ts-ignore
		Blockbench.showMessageBox({
			title: "Export error",
			// tl('iaentitymodel.exporters.vanillaAnimation.dialogs.errors.namespaceMismatch', {
			// 	projectNamespace,
			// 	folderNamespace
			// })
			message: "Wrong namespace. The project namespace is '" + projectNamespace + "' but the ItemsAdder folder namespace is '" + folderNamespace + "'!",
			icon: 'error'
		})
		return
	}

	const exporterSettings: vanillaAnimationExporterSettings =
		data.settings.vanillaAnimationExporter
	const generated = await createAnimationFile(
		data.bones,
		data.models,
		data.animations, // Animations (each entry is RenderedAnimation)
		data.settings,
		data.variantModels,
		data.scaleModels,
		data.variantTextureOverrides,
		data.variantTouchedModels
	)

	const staticAnimationUuid = store.get('staticAnimationUuid')
	await exportAnimationFile(generated, data.settings, exporterSettings)

	// Check if it's an emote
	if (isInternalModel(settings)) {
		// Iterate all .yml files in the project folder and check if they contain the emote, otherwise generate a new one.
		const projectFolder = getProjectFolder()
		function getAllYmlFiles(dir: string): string[] {
			let results: string[] = [];
			const list = fs.readdirSync(dir);
			list.forEach(function (file) {
				const filePath = path.join(dir, file);
				const stat = fs.statSync(filePath);
				if (stat && stat.isDirectory()) {
					results = results.concat(getAllYmlFiles(filePath));
				} else if (file.endsWith('.yml')) {
					results.push(filePath);
				}
			});
			return results;
		}

		const files = getAllYmlFiles(projectFolder);
		let yamlData = undefined;
		let ymlFile = undefined;
		for (const file of files) {
			const fileContent = fs.readFileSync(file, 'utf8');
			let currentYamlData;
			try {
				currentYamlData = yaml.load(fileContent);
			} catch (e) {
				console.warn(`Failed to parse YAML file: ${file}`, e);
				continue;
			}

			if (currentYamlData && currentYamlData.info && currentYamlData.info.namespace === settings.iaentitymodel.namespace) {
				console.log(`File ${file} contains the correct namespace: ${settings.iaentitymodel.namespace}`);

				// Check if the file contains the emote
				if (currentYamlData.emotes) {
					// NOTE: this will cause issues if there are multiple files with emotes declarations for this namespace.
					yamlData = currentYamlData;
					ymlFile = file;
					console.log(`File ${file} contains the emote: ${settings.iaentitymodel.projectName}`);

					// Update the emotes with the animations, and remove the unrecognized ones (old ones probably)
					const validEmoteNames = new Set(
						Object.values(data.animations as aj.Animations)
							.filter(anim => anim && typeof anim.name === "string")
							.map(anim => anim.name)
					);

					// Remove emotes not present in current animations
					for (const emoteName of Object.keys(currentYamlData.emotes)) {
						if (!validEmoteNames.has(emoteName)) {
							delete currentYamlData.emotes[emoteName];
						}
					}

					// Add/update emotes from current animations
					for (const [key, anim] of Object.entries(data.animations as aj.Animations)) {
						if (key === staticAnimationUuid) continue;
						if (anim && typeof anim.name === "string") {
							if (currentYamlData.emotes[anim.name]) {
								// Merge properties, existing properties take precedence unless overwritten
								currentYamlData.emotes[anim.name] = {
									...currentYamlData.emotes[anim.name],
									id: anim.name,
									can_player_move: Boolean(anim.canPlayerMove),
								};
							} else {
								currentYamlData.emotes[anim.name] = {
									id: anim.name,
									can_player_move: Boolean(anim.canPlayerMove),
								};
							}
						}
					}

					break;
				}
			}
		}

		if (!yamlData) {
			ymlFile = path.join(projectFolder, "custom_emote_" + settings.iaentitymodel.projectName + ".yml");
			yamlData = {
				info: {
					namespace: settings.iaentitymodel.namespace,
				},
				emotes: {}
			};

			for (const [key, anim] of Object.entries(data.animations as aj.Animations)) {
				if (key === staticAnimationUuid) continue;
				if (anim && typeof anim.name === "string") {
					yamlData.emotes[anim.name] = {
						id: anim.name,
						can_player_move: Boolean(anim.canPlayerMove),
					}
				}
			}
		}

		fs.writeFileSync(ymlFile, yaml.dump(yamlData), 'utf8');
		console.log(`Created new YML file: ${ymlFile}`);
	}

	Blockbench.showQuickMessage(tl('iaentitymodel.popups.successfullyExported'))
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