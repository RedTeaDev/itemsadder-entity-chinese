import { CustomAction } from '../../util/customAction'
import { tl } from '../../util/intl'
import { refreshIcons } from '../../util/utilz'
import { isCustomFormat } from '../../modelFormat'

export type AJGroup = {
	nbt: string
	head: boolean
	leftHandPivot: boolean
	rightHandPivot: boolean
	mount: boolean
	locator: boolean
	hitbox: boolean
	eyesHeight: boolean
	boneType: string
	maxHeadRotX: number
	maxHeadRotY: number
} & Group


const form1 = {
	boneType: {
		type: 'radio',
		 label: tl(
			 'iaentitymodel.dialogs.boneConfig.boneType'
		 ),
		 value: false,
		options: {
			"normal": tl('iaentitymodel.dialogs.boneConfig.normal'),
			"leftHandPivot": tl('iaentitymodel.dialogs.boneConfig.leftHandPivot'),
			"rightHandPivot": tl('iaentitymodel.dialogs.boneConfig.rightHandPivot'),
			"mount": tl('iaentitymodel.dialogs.boneConfig.mount'),
			"locator": tl('iaentitymodel.dialogs.boneConfig.locator'),
			"hitbox": tl('iaentitymodel.dialogs.boneConfig.hitbox'),
			"eyesHeight": tl('iaentitymodel.dialogs.boneConfig.eyesHeight'),
			"head": tl('iaentitymodel.dialogs.boneConfig.head'),
		}
	}
} as { [formElement: string]: '_' | DialogFormElement }

const form2 = {
	...form1,
	separator : '_',
	title_headProperties: { // hack to show a "title"
		type: "radio",
		label: tl(
			'iaentitymodel.dialogs.boneConfig.headProperties'
		),
	},
	maxHeadRotX: {
		type: 'number',
		 label: tl(
			 'iaentitymodel.dialogs.boneConfig.maxHeadRotX'
		 ),
		 value: 40
	},
	maxHeadRotY: {
		type: 'number',
		 label: tl(
			 'iaentitymodel.dialogs.boneConfig.maxHeadRotY'
		 ),
		 value: 75
	},
} as { [formElement: string]: '_' | DialogFormElement }

const openBoneConfig = CustomAction('iaentitymodel.BoneConfig', {
	name: 'Bone Config',
	icon: 'settings',
	category: 'edit',
	condition: isCustomFormat,
	click: click,
})

function click (ev: any) {
	console.log('Opened bone config')
	const selected = Group.selected as AJGroup

	let form = form1;
	if(selected.boneType === "head")
		form = form2;
	
	const dialog = new Dialog({
		title: tl('iaentitymodel.dialogs.boneConfig.title'),
		id: 'boneConfig',
		form: form,
		onConfirm: (formData: any) => {
			console.log(formData)
			selected.boneType = formData.boneType

			if(selected.boneType === "head") {
				selected.maxHeadRotX = formData.maxHeadRotX
				selected.maxHeadRotY = formData.maxHeadRotY
				
				// Apply this change to every other head bone
				for(const group of Group.all as AJGroup[]) {
					if(group.boneType === "head") {
						if(selected.name === group.name)
							continue
						else {
							group.maxHeadRotX = formData.maxHeadRotX
							group.maxHeadRotY = formData.maxHeadRotY
						}
					}
				}
			} else {
				selected.maxHeadRotX = undefined
				selected.maxHeadRotY = undefined
			}

			refreshIcons()
			dialog.hide()
		},
		onFormChange: (formData: any) => {
			// To refresh the dialog buttons, very hacky.
			dialog.confirm()
			click(null)
		}
	}).show()
	
	document.querySelector('#' + selected.boneType)["checked"] = true

	if(selected.boneType === "head") {
		document.querySelector('#maxHeadRotX')["value"] = selected.maxHeadRotX ? selected.maxHeadRotX : 40
		document.querySelector('#maxHeadRotY')["value"] = selected.maxHeadRotY ? selected.maxHeadRotY : 75
	}
}

// Properties registration to make Blockbench save them in the project file
new Property(Group, 'string', 'boneType', {
	default: () => '',
	exposed: true,
	condition: (val: any) => val !== undefined && val !== "" && val !== "normal"
})
new Property(Group, 'number', 'maxHeadRotX', {
	default: () => undefined,
	exposed: true,
	condition: (val: any) => val !== undefined && val !== ""
})
new Property(Group, 'number', 'maxHeadRotY', {
	default: () => undefined,
	exposed: true,
	condition: (val: any) => val !== undefined && val !== ""
})

// @ts-ignore
Group.prototype.menu.structure.splice(3, 0, openBoneConfig)
// @ts-ignore
openBoneConfig.menus.push({ menu: Group.prototype.menu, path: '' })