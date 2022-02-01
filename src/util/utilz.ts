import * as path from "path/posix"
import * as fs from 'fs'

export function getModelExportFolder(settings) {
    let dirPath = Project.save_path.replace(Project.name + "." + Project.format["codec"].id, "").slice(0, -1);
	dirPath = path.normalize(dirPath);

    const modelsPath = path.join(
		dirPath,
		"assets",
		settings.iaentitymodel.namespace,
		"models", 
		"entity",
        settings.iaentitymodel.projectName
	)

    //Shit
    fs.mkdirSync(modelsPath, { recursive: true });


    //Double shit
    const texturesPath = path.join(
		dirPath,
		"assets",
		settings.iaentitymodel.namespace,
		"textures", 
		"entity",
        settings.iaentitymodel.projectName
	)
    fs.mkdirSync(texturesPath, { recursive: true });

    return modelsPath;
}