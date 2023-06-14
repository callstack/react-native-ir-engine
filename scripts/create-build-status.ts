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

import appRootPath from 'app-root-path'
import cli from 'cli'
/* eslint-disable @typescript-eslint/no-var-requires */
import dotenv from 'dotenv-flow'
import fs from 'fs'
import Sequelize, { DataTypes } from 'sequelize'

dotenv.config({
  path: appRootPath.path,
  silent: true
})

const db = {
  username: process.env.MYSQL_USER ?? 'server',
  password: process.env.MYSQL_PASSWORD ?? 'password',
  database: process.env.MYSQL_DATABASE ?? 'etherealengine',
  host: process.env.MYSQL_HOST ?? '127.0.0.1',
  port: process.env.MYSQL_PORT ?? 3306,
  dialect: 'mysql',
  charset: 'utf8mb4',
  collate: 'utf8mb4_general_ci',
  url: ''
}

db.url = process.env.MYSQL_URL ?? `mysql://${db.username}:${db.password}@${db.host}:${db.port}/${db.database}`

cli.enable('status')

cli.main(async () => {
  try {
    const sequelizeClient = new Sequelize({
      ...db,
      logging: console.log,
      define: {
        freezeTableName: true
      }
    })

    await sequelizeClient.sync()

    const dateNow = new Date()

    const BuildStatus = sequelizeClient.define('build_status', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      status: {
        type: DataTypes.STRING,
        defaultValue: 'pending'
      },
      logs: {
        type: DataTypes.TEXT
      },
      dateStarted: {
        type: DataTypes.DATE
      },
      dateEnded: {
        type: DataTypes.DATE
      },
      commitSHA: {
        type: DataTypes.STRING
      }
    })

    await BuildStatus.sync()

    await BuildStatus.update(
      {
        status: 'ended',
        dateEnded: dateNow
      },
      {
        where: {
          status: 'pending'
        }
      }
    )

    const newBuildStatus = await BuildStatus.create({
      dateStarted: dateNow,
      commitSHA: process.env.TAG ? process.env.TAG.split('_')[1] : ''
    })

    const path = appRootPath.path + `/builder-run.txt`
    fs.writeFileSync(path, newBuildStatus.id.toString())

    cli.exit(0)
  } catch (err) {
    console.log(err)
    cli.fatal(err)
  }
})
