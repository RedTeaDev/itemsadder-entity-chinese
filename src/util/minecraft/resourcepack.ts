//@ts-ignore
import * as path from 'path'
import * as fs from 'fs'
import { CustomError } from '../customError'
import { tl } from '../intl'
import { normalizePath } from '../misc'
import { getTexturesExportFolder } from '../utilz'
import { settings } from '../../settings'

function getTextureReference(texture: any) {
	const parts = texture.path.split(path.sep)
	const assetsIndex = parts.indexOf('assets')
	if (assetsIndex) {
		const relative = parts.slice(assetsIndex + 1) // Remove 'assets' and everything before it from the path
		const namespace = relative.shift() // Remove the namespace from the path and store it
		if (namespace && relative.length) {
			relative.push(relative.pop().replace(/.png$/, '')) // Remove file type (.png)
			if (relative) {
				const textureIndex = relative.indexOf('textures') // Locate 'texture' in the path
				if (textureIndex > -1) {
					relative.splice(textureIndex, 1) // Remove 'texture' from the path
					const textureReference = `${namespace}:${normalizePath(
						path.join(...relative)
					)}` // Generate texture path
					console.log('Texture Reference:', textureReference)
					return textureReference
				}
			}
		}
	}
	console.log('Failed to generate path for:', texture)
	throw new CustomError('Unable to generate texture path', {
		dialog: {
			id: 'iaentitymodel.dialogs.errors.unableToGenerateTexturePath',
			title: tl(
				'iaentitymodel.dialogs.errors.unableToGenerateTexturePath.title'
			),
			lines: [
				tl(
					'iaentitymodel.dialogs.errors.unableToGenerateTexturePath.body',
					{
						textureName: texture.name,
					}
				),
			],
			width: 512,
			singleButton: true,
		},
	})
}

export function getTexturePath(texture: any) {
	console.log('Saving texture:', texture)

	if(texture.namespace === "minecraft") {
		return getTextureReference(texture)
	}

	let texturesFolder = getTexturesExportFolder(settings)
	let newPath = path.join(texturesFolder, texture.name.toLowerCase())

	if(texture.saved && texture.path !== '') {
		if(fs.existsSync(texture.path)) {
			fs.copyFile(texture.path, newPath, (err) => {
				if (err) {
					console.error(err)
					return
				}
				console.log('Copied texture to export path', newPath)
			});
		} else {
			texture.saved = false
			fs.closeSync(fs.openSync(texture.path, 'w')) // Hack to create a blank file
			texture.save(false)
			texture.saved = true
		}
	}

	return getTextureReference(texture)
}

export function getModelPath(modelPath: string, modelName: string) {
	console.log(modelPath)
	const parts = modelPath.split(path.sep)
	const assetsIndex = parts.indexOf('assets')
	if (assetsIndex) {
		const relative = parts.slice(assetsIndex + 1) // Remove 'assets' and everything before it from the path
		const namespace = relative.shift() // Remove the namespace from the path and store it
		if (namespace && relative.length) {
			relative.push(relative.pop().replace(/.png$/, '')) // Remove file type (.png)
			if (relative) {
				const modelsIndex = relative.indexOf('models') // Locate 'texture' in the path
				if (modelsIndex > -1) {
					relative.splice(modelsIndex, 1) // Remove 'texture' from the path
					const modelReference = `${namespace}:${normalizePath(
						path.join(...relative)
					)}` // Generate texture path
					console.log('Model Reference:', modelReference)
					return modelReference
				}
			}
		}
	}
	throw new CustomError('Unable to generate model path', {
		dialog: {
			id: 'iaentitymodel.dialogs.errors.unableToGenerateModelPath',
			title: tl(
				'iaentitymodel.dialogs.errors.unableToGenerateModelPath.title'
			),
			lines: [
				tl(
					'iaentitymodel.dialogs.errors.unableToGenerateModelPath.body',
					{
						modelName,
					}
				),
			],
			width: 512,
			singleButton: true,
		},
	})
}
