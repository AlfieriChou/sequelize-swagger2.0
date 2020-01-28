const path = require('path')
const fs = require('fs')
const _ = require('lodash')
const Sequelize = require('sequelize')
const queryInterface = require('./index')

let tasks = []
fs.readdirSync(path.resolve(__dirname, './migration')).forEach((file) => {
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const migrations = require(path.resolve(`./migration/${file}`))(Sequelize)
  const funcArray = []
  migrations.forEach((migration) => {
    if (_.isPlainObject(migration) && migration.opt === 'create') {
      funcArray.push(async () => {
        const tables = await queryInterface.showAllTables()
        if (tables.indexOf(migration.table) < 0) {
          queryInterface.createTable(migration.table, migration.column, { charset: 'utf8' })
        }
      })
    }
    if (_.isPlainObject(migration) && migration.opt === 'addColumn') {
      funcArray.push(async () => {
        const describe = await queryInterface.describeTable(migration.table)
        if (!describe[migration.field]) {
          queryInterface.addColumn(migration.table, migration.field, Object.assign(
            migration.type,
            { after: migration.after }
          ))
        }
      })
    }
    if (_.isPlainObject(migration) && migration.opt === 'changeColumn') {
      funcArray.push(async () => {
        const describe = await queryInterface.describeTable(migration.table)
        if (describe[migration.field]) {
          queryInterface.changeColumn(migration.table, migration.field, migration.type)
        }
      })
    }
    if (_.isPlainObject(migration) && migration.opt === 'renameColumn') {
      funcArray.push(async () => {
        const describe = await queryInterface.describeTable(migration.table)
        if (describe[migration.before]) {
          queryInterface.renameColumn(migration.table, migration.before, migration.after)
        }
      })
    }
    if (_.isPlainObject(migration) && migration.opt === 'removeColumn') {
      funcArray.push(async () => {
        const describe = await queryInterface.describeTable(migration.table)
        if (describe[migration.field]) {
          queryInterface.removeColumn(migration.table, migration.field)
        }
      })
    }
    if (_.isPlainObject(migration) && migration.opt === 'addIndex') {
      funcArray.push(async () => queryInterface.addIndex(
        migration.table,
        migration.attributes,
        migration.options
      ))
    }
    if (_.isPlainObject(migration) && migration.opt === 'removeIndex') {
      funcArray.push(async () => {
        if (migration.attributes.length === 1) {
          queryInterface.removeIndex(migration.table, migration.attributes[0])
        }
        queryInterface.removeColumn(migration.table, migration.attributes)
      })
    }
    if (_.isPlainObject(migration) && migration.opt === 'query') {
      funcArray.push(async () => queryInterface.sequelize.query(migration.sql))
    }
  })
  tasks = _.union(tasks, funcArray)
})
Promise
  .reduce(tasks, (total, task) => Promise.resolve().then(task), 0)
  .then(() => {
    // eslint-disable-next-line no-console
    console.log('sync db done!')
    process.exit()
  })
