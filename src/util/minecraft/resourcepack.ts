//@ts-ignore
import * as path from 'path'
import * as fs from 'fs'
import { CustomError } from '../customError'
import { tl } from '../intl'
import { normalizePath } from '../misc'
import { getTexturesExportFolder } from '../utilz'
import { settings } from '../../settings'

function getTextureReferenceByPath(pathStr: string, name : string) {
	const parts = pathStr.split(path.sep)
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
	console.log('Failed to generate path for:', pathStr)
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
						textureName: name,
					}
				),
			],
			width: 512,
			singleButton: true,
		},
	})
}

function getTextureReference(texture: TextureData) {
	return getTextureReferenceByPath(texture.path, texture.name);
}

export function getTexturePath(texture: any) {
	console.log('Saving texture:', texture)

	if(texture.namespace === "minecraft") {
		return getTextureReference(texture)
	}

	let texturesFolder = getTexturesExportFolder(settings)
	let newPath = path.join(texturesFolder, texture.name.toLowerCase())

	// If the newPath does not end with .png, append it
	if (!newPath.endsWith('.png')) {
		newPath += '.png'
	}

	if(texture.path === '') {
		texture.path = newPath
	}

	if(texture.saved && fs.existsSync(texture.path)) {
		fs.copyFile(texture.path, newPath, (err) => {
			if (err) {
				console.error(err)
				return
			}
			console.log('Copied texture to export path', newPath)
		});
	} else {
		texture.saved = false
		const dataUrl = texture.getDataURL();
		if (typeof dataUrl === 'string' && dataUrl.startsWith('data:image/png;base64,')) {
			const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
			fs.writeFileSync(newPath, base64Data, 'base64');
			texture.saved = true;
			console.log('Created new texture file at', newPath);

			// Export the texture animation if it has one
			if (texture.frameCount && texture.frameCount > 1) {
				const metaContent = texture.getMCMetaContent();
				if (metaContent) {
					const metaPath = newPath.replace(/\.png$/, '.png.mcmeta');
					fs.writeFileSync(metaPath, JSON.stringify(metaContent, null, 2));
					console.log('Created .mcmeta file at', metaPath);
				}
			}
		} else {
			console.error('Invalid data URL for texture:', dataUrl);
		}
	}

	return getTextureReferenceByPath(newPath, texture.name)
}

/***
 * Returns the Minecraft notation of a model path.
 * For example returns: `my_items:item/sword_1` from `project/assets/my_items/textures/item/sword_1.png`
 */
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
