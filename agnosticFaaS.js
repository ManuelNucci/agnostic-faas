function AgnosticFaaS(config) {

	let functionList = {}

	const keys = Object.keys(config)

	// structure to hold function triggers (or types)
	const functionTriggers = {
		callable: (fn, triggerOptions) => {

			return (data, context) => {
				let params = { data: data, context: context }

				return fn.implementation(params)
					.catch((e) => {
						// TODO: send error somewhere
					})
			}

		},
		request: (fn, triggerOptions) => {

			return (req, res) => {
				let params = { data: req.body, context: { req: req, res: res } }

				return fn.implementation(params)
					.catch((e) => {
						// TODO: send error somewhere
					})
			}

		},
		rest: (fn, triggerOptions) => {
			return main => {
				let params = { data: app }

				return fn.implementation(params)
					.catch((e) => {
						// TODO: send error somewhere
					})
			}
		},
		pubsub: (fn, triggerOptions) => {
			/*
				  if (typeof triggerOptions.topic === "undefined")
					throw new Error('Function ' + fn.module + ' doesn\'t have a topic defined in functions.json.')
			*/
			return event => {
				let params = { data: JSON.parse(Buffer.from(event.data, 'base64').toString()), attributes: event.attributes }

				return fn.implementation(params)
					.catch((e) => {
						console.error(e)
					})
			}

		},
		onCreate: (fn, triggerOptions) => {
			/*
				  if (typeof triggerOptions.document === "undefined")
					throw new Error('Function ' + fn.module + ' doesn\'t have a document defined in functions.json.')
			*/
			return (snap, context) => {
				context.snap = snap
				let params = { data: snap.data(), context: context }

				return fn.implementation(params)
					.catch((e) => {
						console.error(e)
					})
			}

		},
		onUpdate: (fn, triggerOptions) => {
			/*
				  if (typeof triggerOptions.document === "undefined")
					throw new Error('Function ' + fn.module + ' doesn\'t have a document defined in functions.json.')
			*/
			return (change, context) => {
				context.change = change
				let params = { data: { newValue: change.after.data(), oldValue: change.before.data() }, context: context }

				return fn.implementation(params)
					.catch((e) => {
						console.error(e)
					})
			}

		}
	}

	const defineFunction = (fn, trigger) => functionTriggers[trigger.type](fn, trigger.options)

	// populate functions with modules for connectors & exports
	for (var i = 0; i < keys.length; i++) {
		let name = keys[i]
		functionList[name] = {
			implementation: require('./src/functions/' + config[name].module),
			triggers: config[name].triggers
		}
	}

	this.functions = function () {

		let fnExports = {}

		for (var i = 0; i < keys.length; i++) {
			let name = keys[i]
			functionList[name].triggers.map((trigger) => {
				// replace function name if it's defined by user; if not, use file name
				if (typeof trigger.options != "undefined" && "name" in trigger.options) {
					let fnName = name + trigger.options['name']
					fnExports[fnName] = defineFunction(functionList[name], trigger)
				}
				else
					fnExports[name] = defineFunction(functionList[name], trigger)
			})
		}

		return fnExports

	}

}

module.exports = AgnosticFaaS