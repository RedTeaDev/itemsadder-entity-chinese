import { CustomAction } from '../../util/customAction'
import { tl } from '../../util/intl'
import { refreshIcons } from '../../util/utilz'

export type AJGroup = {
	nbt: string
	armAnimationEnabled: boolean
	isHead: boolean
	isLeftHandPivot: boolean
	isRightHandPivot: boolean
	isMount: boolean
	isLocator: boolean
} & Group

const openBoneConfig = CustomAction('iaentitymodel.BoneConfig', {
	name: 'Bone Config',
	icon: 'settings',
	category: 'edit',
	condition: () => true,
	click: function (ev: any) {
		console.log('Opened bone config')
		const selected = Group.selected as AJGroup
		const dialog = new Dialog({
			title: tl('iaentitymodel.dialogs.boneConfig.title'),
			id: 'boneConfig',
			form: {
				/*nbt: {
					type: 'textarea',
					label: tl('iaentitymodel.boneConfig.boneNbt'),
					value: selected.nbt,
				},*/
				isHead: {
					type: 'checkbox',
				 	label: tl(
				 		'iaentitymodel.dialogs.boneConfig.isHead'
				 	),
				 	value: false,
				},
				isLeftHandPivot: {
					type: 'checkbox',
				 	label: tl(
				 		'iaentitymodel.dialogs.boneConfig.isLeftHandPivot'
				 	),
				 	value: false,
				},
				isRightHandPivot: {
					type: 'checkbox',
				 	label: tl(
				 		'iaentitymodel.dialogs.boneConfig.isRightHandPivot'
				 	),
				 	value: false,
				},
				isMount: {
					type: 'checkbox',
				 	label: tl(
				 		'iaentitymodel.dialogs.boneConfig.isMount'
				 	),
				 	value: false,
				},
				isLocator: {
					type: 'checkbox',
				 	label: tl(
				 		'iaentitymodel.dialogs.boneConfig.isLocator'
				 	),
				 	value: false,
				},
			},
			onConfirm: (formData: any) => {
				console.log(formData)
				//selected.nbt = formData.nbt
				selected.isHead = formData.isHead
				selected.isLeftHandPivot = formData.isLeftHandPivot
				selected.isRightHandPivot = formData.isRightHandPivot
				selected.isMount = formData.isMount
				selected.isLocator = formData.isLocator
				// selected.armAnimationEnabled = formData.armAnimationEnabled

				// Apply some of the properties to all the sub groups too. For now only "isHead".
				for (const [childName, child_] of Object.entries(selected.children)) {
					if(child_ instanceof Group) {
						let child = child_ as AJGroup;
						child.isHead = selected.isHead;
					}
				}

				refreshIcons()
				dialog.hide()
			},
		}).show()
		//document.querySelector('#nbt').value = selected.nbt
		document.querySelector('#isHead')["checked"] = selected.isHead
		document.querySelector('#isLeftHandPivot')["checked"] = selected.isLeftHandPivot
		document.querySelector('#isRightHandPivot')["checked"] = selected.isRightHandPivot
		document.querySelector('#isMount')["checked"] = selected.isMount
		document.querySelector('#isLocator')["checked"] = selected.isLocator
		selected.isHead = false
		selected.isLeftHandPivot = false
		selected.isRightHandPivot = false
		selected.isMount = false
		selected.isLocator = false
	},
})

// Properties registration
new Property(Group, 'string', 'nbt', {
	default: () => '{}',
	exposed: true,
})
new Property(Group, 'string', 'isHead', {
	default: () => false,
	exposed: true,
})
new Property(Group, 'string', 'isLeftHandPivot', {
	default: () => false,
	exposed: true,
})
new Property(Group, 'string', 'isRightHandPivot', {
	default: () => false,
	exposed: true,
})
new Property(Group, 'string', 'isMount', {
	default: () => false,
	exposed: true,
})
new Property(Group, 'string', 'isLocator', {
	default: () => false,
	exposed: true,
})

// @ts-ignore
Group.prototype.menu.structure.splice(3, 0, openBoneConfig)
// @ts-ignore
openBoneConfig.menus.push({ menu: Group.prototype.menu, path: '' })