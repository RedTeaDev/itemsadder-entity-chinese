import { CustomAction } from '../../util/customAction'
import { tl } from '../../util/intl'
import { refreshIcons } from '../../util/utilz'

export type AJGroup = {
	nbt: string
	armAnimationEnabled: boolean
	isHead: boolean
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
				//TODO: hand location?
				// armAnimationEnabled: {
				// 	type: 'checkbox',
				// 	label: tl(
				// 		'iaentitymodel.boneConfig.armAnimationEnabled'
				// 	),
				// 	value: false,
				// },
			},
			onConfirm: (formData: any) => {
				console.log(formData)
				//selected.nbt = formData.nbt
				selected.isHead = formData.isHead
				// selected.armAnimationEnabled = formData.armAnimationEnabled

				// Apply some of the properties to all the sub groups too.
				for (const [childName, child_] of Object.entries(selected.children)) {
					console.log("amogus", child_)
					
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
		// console.log(selected.armAnimationEnabled)
		// TODO Add armor_stand arm animation
		// document.querySelector('#armAnimationEnabled').checked =
		// 	selected.armAnimationEnabled
		selected.armAnimationEnabled = false
		selected.isHead = false
	},
})

// Properties registration
new Property(Group, 'string', 'nbt', {
	default: () => '{}',
	exposed: true,
})
new Property(Group, 'string', 'armAnimationEnabled', {
	default: () => false,
	exposed: true,
})
new Property(Group, 'string', 'isHead', {
	default: () => false,
	exposed: true,
})

// @ts-ignore
Group.prototype.menu.structure.splice(3, 0, openBoneConfig)
// @ts-ignore
openBoneConfig.menus.push({ menu: Group.prototype.menu, path: '' })