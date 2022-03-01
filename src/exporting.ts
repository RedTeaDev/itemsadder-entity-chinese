import type * as aj from './iaentitymodel'

import * as fs from 'fs'
import * as path from 'path'
import { tl } from './util/intl'
import { mkdir } from './util/ezfs'
import { settings } from './settings'
import { CustomError } from './util/customError'
// @ts-ignore
import transparent from './assets/transparent.png'
import { getModelExportFolder, toJson } from './util/utilz'

// Exports the model.json rig files
async function exportRigModels(
	models: aj.ModelObject,
	variantModels: aj.VariantModels,
	scaleModels: aj.ScaleModels
) {
	console.groupCollapsed('Export Rig Models')

	const modelExportFolder = getModelExportFolder(settings)
	const metaPath = path.join(
		modelExportFolder,
		'.uuid'
	)

	// Set uuid on project, it's undefined on project creation for some reason.
	// @ts-ignore
	if(Project.UUID === undefined)
		// @ts-ignore
		Project.UUID = guid();

	if (!fs.existsSync(metaPath)) {
		const files = fs.readdirSync(
			modelExportFolder
		)
		// If the meta folder is empty, just write the meta and export models. However it there are other files/folder in there, show a warning.
		if (files.length > 0) {
			await new Promise<void>((resolve, reject) => {
				let d = new Dialog({
					id: 'iaentitymodel.rigFolderHasUnknownContent',
					title: tl(
						'iaentitymodel.dialogs.errors.rigFolderHasUnknownContent.title'
					),
					lines: [
						tl(
							'iaentitymodel.dialogs.errors.rigFolderHasUnknownContent.body',
							{
								path: modelExportFolder,
								files: files.join(', '),
							}
						),
					],
					// @ts-ignore
					width: 512 + 128,
					buttons: ['Overwrite', 'Cancel'],
					confirmIndex: 0,
					cancelIndex: 1,
					onConfirm() {
						d.hide()
						Blockbench.writeFile(metaPath, {
							// @ts-ignore
							content: Project.UUID,
							custom_writer: null,
						})
						resolve()
					},
					onCancel() {
						d.hide()
						reject(
							new CustomError(
								'Rig Folder Unused -> User Cancelled Export Process',
								{ intentional: true, silent: true }
							)
						)
					},
				}).show()
			})
		} else {
			Blockbench.writeFile(metaPath, {
				// @ts-ignore
				content: Project.UUID,
				custom_writer: null,
			})
		}
		// @ts-ignore
	} else if (fs.readFileSync(metaPath, 'utf-8') !== Project.UUID) {
		const files = fs.readdirSync(
			modelExportFolder
		)
		await new Promise<void>((resolve, reject) => {
			let d = new Dialog({
				id: 'iaentitymodel.rigFolderAlreadyUsedByOther',
				title: tl(
					'iaentitymodel.dialogs.errors.rigFolderAlreadyUsedByOther.title'
				),
				lines: [
					tl(
						'iaentitymodel.dialogs.errors.rigFolderAlreadyUsedByOther.body',
						{
							path: modelExportFolder,
							files: files.join(', '),
						}
					),
				],
				// @ts-ignore
				width: 512 + 128,
				buttons: ['Overwrite', 'Cancel'],
				confirmIndex: 0,
				cancelIndex: 1,
				onConfirm() {
					d.hide()
					Blockbench.writeFile(metaPath, {
						// @ts-ignore
						content: Project.UUID,
						custom_writer: null,
					})
					resolve()
				},
				onCancel() {
					d.hide()
					reject(
						new CustomError(
							'Rig Folder Already Occupied -> User Cancelled Export Process',
							{ intentional: true, silent: true }
						)
					)
				},
			}).show()
		})
	}

	console.log('Export Models:', models)
	console.group('Details')

	for (const [name, model] of Object.entries(models)) {
		// Get the model's file path
		const modelFilePath = path.join(
			modelExportFolder,
			name + '.json'
		)

		// Export the model
		console.log('Exporting Model', modelFilePath, model.elements)
		const modelJSON = {
			...model,
			aj: undefined,
		}
		
		Blockbench.writeFile(modelFilePath, {
			content: toJson(modelJSON),
			custom_writer: null,
		})
	}
	console.groupEnd()

	console.log('Export Scale Models:', scaleModels)
	console.group('Details')
	for (const [modelName, scales] of Object.entries(scaleModels)) {
		// Export the models
		for (const [scale, model] of Object.entries(scales)) {
			// Get the model's file path
			const modelFilePath = path.join(
				getModelExportFolder(settings),
				`${modelName}_${scale}.json`
			)

			console.log('Exporting Model', scale, modelFilePath)
			const modelJSON = {
				...model,
				aj: undefined,
			}

			Blockbench.writeFile(modelFilePath, {
				content: autoStringify(modelJSON),
				custom_writer: null,
			})
		}
	}
	console.groupEnd()

	console.log('Export Variant Models:', variantModels)
	console.group('Details')

	for (const [variantName, variant] of Object.entries(variantModels)) {
		const variantFolderPath = path.join(
			modelExportFolder,
			variantName
		)
		// Don't export empty variants
		if (Object.entries(variant).length < 1) continue

		mkdir(variantFolderPath, { recursive: true })

		for (const [modelName, model] of Object.entries(variant)) {
			// Get the model's file path
			const modelFilePath = path.join(
				variantFolderPath,
				`${modelName}.json`
			)
			console.log('Exporting Model', modelFilePath)
			// Export the model
			const modelJSON = {
				...model,
				aj: undefined,
			}
			
			Blockbench.writeFile(modelFilePath, {
				content: toJson(modelJSON),
				custom_writer: null,
			})
		}
	}
	console.groupEnd()

	console.groupEnd()
}

async function exportTransparentTexture() {
	console.log(transparent)
	Blockbench.writeFile(settings.iaentitymodel.transparentTexturePath, {
		content: Buffer.from(
			String(transparent).replace('data:image/png;base64,', ''),
			'base64'
		),
		custom_writer: null,
	})
}

export { exportRigModels, exportTransparentTexture }
