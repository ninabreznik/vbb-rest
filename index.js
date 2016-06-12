'use strict'

const config       = require('config')
const fs           = require('fs')
const express      = require('express')
const https        = require('https')
const hsts         = require('hsts')
const morgan       = require('morgan')
const shorthash    = require('shorthash').unique
const corser       = require('corser')
const nocache      = require('nocache')

const stations     = require('./lib/stations')
const station      = require('./lib/station')
const lines        = require('./lib/lines')
const line         = require('./lib/line')
const nearby       = require('./lib/nearby')
const departures   = require('./lib/departures')
const routes       = require('./lib/routes')
const locations    = require('./lib/locations')
const maps         = require('./lib/maps')

const ssl = {
	  key:  fs.readFileSync(config.key)
	, cert: fs.readFileSync(config.cert)
	, ca:   fs.readFileSync(config.ca)
}



const api = express()
const server = https.createServer(ssl, api)

api.use(hsts({maxAge: 24 * 60 * 60 * 1000}))
morgan.token('ip', (req, res) => shorthash(req.ip))
api.use(morgan(':date[iso] :ip :method :url :status :response-time ms'))
api.use(corser.create()) // CORS
const noCache = nocache()



api.get('/stations', stations)
api.get('/stations/nearby', nearby)
api.get('/stations/:id', station)
api.get('/stations/:id/departures', noCache, departures)
api.get('/lines', lines)
api.get('/lines/:id', line)
api.get('/routes', noCache, routes)
api.get('/locations', locations)
api.get('/maps/:type', maps)

api.use((err, req, res, next) => {
	// todo: move this to vbb-util?
	     if (err.code === 'R5000') err.statusCode = 401
	else if (err.code === 'R0002') err.statusCode = 400
	else if (err.code === 'H890')  err.statusCode = 404
	else if (err.code === 'H9240') err.statusCode = 404
	else if (!err.statusCode)      err.statusCode = 502
	res.status(err.statusCode || 500).json({error: true, msg: err.message})
	next()
})



server.listen(config.port, () => console.log(`Listening on ${config.port}.`))
