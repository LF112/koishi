import { getSelfIds, injectMethods, GroupData, createGroup, Group } from 'koishi-core'
import { noop, observe } from 'koishi-utils'
import {} from './database'

injectMethods('level', 'group', {
  async getGroup (groupId, selfId): Promise<GroupData> {
    selfId = typeof selfId === 'number' ? selfId : 0
    const data = await this.tables.group.get(groupId).catch(noop) as GroupData | void
    if (data) return data
    const fallback = createGroup(groupId, selfId)
    if (selfId && groupId) {
      await this.tables.group.put(groupId, fallback)
    }
    return fallback
  },

  async getAllGroups (...args) {
    const assignees = args.length > 1 ? args[1]
      : args.length && typeof args[0][0] === 'number' ? args[0] as never
        : await getSelfIds()
    if (!assignees.length) return []
    return new Promise((resolve) => {
      const groups: GroupData[] = []
      this.tables.group.createValueStream()
        .on('data', (group: GroupData) => {
          if (assignees.includes(group.assignee)) {
            groups.push(group)
          }
        })
        .on('end', () => resolve(groups))
    })
  },

  async setGroup (groupId, data) {
    return this.update('group', groupId, data)
  },

  async observeGroup (group, selfId) {
    if (typeof group === 'number') {
      const data = await this.getGroup(group, selfId)
      return data && observe(data, diff => this.setGroup(group, diff), `group ${group}`)
    }

    const data = await this.getGroup(group.id, selfId)
    if ('_diff' in group) return (group as Group)._merge(data)
    return observe(Object.assign(group, data), diff => this.setGroup(group.id, diff), `group ${group.id}`)
  },

  getGroupCount () {
    return this.count('group')
  },
})
