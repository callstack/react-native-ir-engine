/*
CPAL-1.0 License

The contents of this file are subject to the Common Public Attribution License
Version 1.0. (the "License"); you may not use this file except in compliance
with the License. You may obtain a copy of the License at
https://github.com/EtherealEngine/etherealengine/blob/dev/LICENSE.
The License is based on the Mozilla Public License Version 1.1, but Sections 14
and 15 have been added to cover use of software over a computer network and 
provide for limited attribution for the Original Developer. In addition, 
Exhibit A has been modified to be consistent with Exhibit B.

Software distributed under the License is distributed on an "AS IS" basis,
WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License for the
specific language governing rights and limitations under the License.

The Original Code is Ethereal Engine.

The Original Developer is the Initial Developer. The Initial Developer of the
Original Code is the Ethereal Engine team.

All portions of the code written by the Ethereal Engine team are Copyright © 2021-2023 
Ethereal Engine. All Rights Reserved.
*/

import { HookContext } from '@feathersjs/feathers'
import { disallow } from 'feathers-hooks-common'

import createGroupOwner from '@etherealengine/server-core/src/hooks/create-group-owner'
import groupPermissionAuthenticate from '@etherealengine/server-core/src/hooks/group-permission-authenticate'
import removeGroupUsers from '@etherealengine/server-core/src/hooks/remove-group-users'

import authenticate from '../../hooks/authenticate'
import logger from '../../ServerLogger'

export default {
  before: {
    all: [authenticate()],
    find: [],
    get: [disallow('external')],
    create: [],
    update: [groupPermissionAuthenticate()],
    patch: [
      groupPermissionAuthenticate(),
      async (context: HookContext): Promise<HookContext> => {
        if (context.arguments[1]?.scopes?.length > 0) {
          const foundItem = await (context.app.service('scope') as any).Model.findAll({
            where: {
              groupId: context.arguments[0]
            }
          })
          if (foundItem.length) {
            foundItem.forEach(async (scp) => {
              await context.app.service('scope').remove(scp.dataValues.id)
            })
          }
          const data = context.arguments[1]?.scopes?.map((el) => {
            return {
              type: el.type,
              groupId: context.arguments[0]
            }
          })
          await context.app.service('scope').create(data)
        }

        return context
      }
    ],
    remove: [groupPermissionAuthenticate(), removeGroupUsers()]
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [
      createGroupOwner(),
      async (context: HookContext): Promise<HookContext> => {
        try {
          const data = context.arguments[0]?.scopes?.map((el) => {
            return {
              type: el.type,
              groupId: context.result.id
            }
          })
          if (data) await context.app.service('scope').create(data)

          return context
        } catch (err) {
          logger.error(err, `GROUP AFTER CREATE ERROR: ${err.error}`)
          return null!
        }
      }
    ],
    update: [],
    patch: [],
    remove: []
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
} as any
