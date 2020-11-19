export default class DynamicCityDropdown {
	constructor(config) {
		const selectors = Object.assign({
			form: '[data-dynamic-cities]',
			state: '[data-state]',
			city: '[data-city]'
		}, config.elements);

		this.selectors = selectors;
		this.form = document.querySelector(selectors.form);
		this.city = document.querySelector(selectors.city);
		this.state = document.querySelector(selectors.state);
		// this.container = config.container;
		if (config.file === undefined) throw Error('Missing file path');
		this.file = config.file;
		// this.type = config.type || 'csv';
		this.worker = new Worker(
			URL.createObjectURL(new Blob([`${this.defineWorker()}`])),
		);
	}

	defineWorker() {
		const cache = {
			active: false,
			states: {},
			templates: {},
		};
		// Respone [ object, status, data ]
		const script =
			'let generator;const cache=' +
			JSON.stringify(cache) +
			';onmessage=' +
			(async ({ data }) => {

				if (!generator) {
					// console.log('no generator');
					cache.states = await fetchIt(data);
					generator = templateGen();
					generator.next();

					postMessage([{ type: 'RESOLVED' }, '']);
					return;
				}

				// console.log('something else');
				// turn long string into a transferable to transfer close to instantly
				const tpl = generator.next(data.state_id).value;

				const buffer = str2ab(tpl);
				// console.log(buffer, tpl);
				// [ status: {}, data: [] ]
				return postMessage([{ type: 'TEMPLATE' }, buffer], [buffer]);

				async function fetchIt(data) {
					let output = {};
					const resp = await fetch(data.file),
						clone = resp.clone(),
						type = await clone.blob().then(({ type }) => type.split('/')[1]),
						method = type === 'csv' ? 'text' : type,
						body = await resp[method]();
					// fetch(data.file).then(r => r.blob().then(console.log));
					/* // TODO: Rebuild JSON handler
					if (cache.type === 'json') {
						for
					}
					*/


					if (type === 'json') {
						let i = 0,
							l = body.length;
						while (l < i) {
							let [state, city] = body[i];
							if (output[state] === undefined) output[state] = [];

							output[state].push(city);
							if (body[++i].state !== state) output[state].sort();
						}
						/*
						for (let [state, cities] of Object.entries(
							body,
						)) {
							if (output[state] === undefined)
								output[state] = [];
							console.log(state);
							let i = 0,
								l = cities.length;

							for (; l > i++;)
								output[state].push(cities[i].city);

							output[state].sort();
						}
						*/
						return output;
					}

					// else handle csv file
					const rows = body.replace(/"/g, '').split('\n'),
						l = rows.length;

					let i = 1;

					for (; l > i; i++) {
						if (rows[i] === '' || rows[i] === undefined) {
							continue;
						}

						// expects the first item in the CSV col to be the city name, 
						// and the second to be the state id (i.e. FL, IA, CA, etc...)
						const [city, id] = rows[i].split(',');

						if (id === undefined) continue;

						if (output[id] === undefined) {
							output[id] = [];
						}

						output[id].push(city);
					}

					for (let cities of Object.values(output)) {
						cities.sort();
					}

					return output;
				}

				function* templateGen() {
					let states = cache.states,
						response;
					//console.log(states);
					while (true) {
						let request = yield response;
						console.log(states, states[request]);
						if (cache.templates[request] === undefined || cache.templates[request].length === 0)
							cache.templates[request] = states[request].map(city => `<option value="${city}" data-city-option>${city}</option>`).join('');
						response = cache.templates[request];
					}
				}

				function str2ab(str) {
					var buf = new ArrayBuffer(str.length * 2), // 2 bytes for each char
						bufView = new Uint16Array(buf),
						i = 0,
						l = str.length;

					for (; i < l; i++) bufView[i] = str.charCodeAt(i);
					return buf;
				}

				// console.log('data', data);
				/*
				if (data.type === 'START') {
					cache.type = data.fileType;
					const resp = await fetch(data.file)

					const output = {};
					const body =
						cache.type == 'json'
							? await resp.json()
							: await resp.text();
					if (cache.type === 'json') {
						for (let [state, cities] of Object.entries(
							body,
						)) {
							if (output[state] === undefined)
								output[state] = [];
							let i = 0,
								l = cities.length;

							for (; l > i++;)
								output[state].push(cities[i].city);

							output[state].sort();
						}

						cache.active = true;
						postMessage({ cacheStatus: true });
						return;
					}

					// else handle csv file
					const rows = body.replace(/"/g, '').split('\n');

					let i = 1;
					const l = rows.length;
					// console.log('rows', rows.length);
					for (; l > i; i++) {
						if (rows[i] === '' || rows[i] === undefined) {
							continue;
						}

						// expects the first item in the CSV col to be the city name, and the second to be the state id (i.e. FL, IA, CA, etc...)

						const [city, id] = rows[i].split(',');

						if (id === undefined) {
							continue;
						}

						if (output[id] === undefined) {
							console.log(id, output);
							output[id] = [];
						}

						output[id].push(city);
					}

					// console.log('endProduct', output);
					for (let cities of Object.values(output)) {
						cities.sort();
					}

					cache.states = output;
					cache.active = true;
					postMessage({ cacheStatus: true });
					return;
				}

				if ('state_id' in data === false || data.state_id === undefined)
					return;

				if (
					cache.templates[data.state_id] !== undefined &&
					cache.templates[data.state_id].length > 0
				) {
					return postMessage({
						response: cache.templates[data.state_id],
					});
				}
				if (cache.states === undefined) return;
				console.log('cache', cache);
				cache.templates[data.state_id] = cache.states[data.state_id]
					.map(
						cityName =>
							`<option value="${cityName}" data-city-option>${cityName}</option>`,
					)
					.join('');

				postMessage({ response: cache.templates[data.state_id] });
				*/
			});
		return script;
	}

	render(buffer, parent) {
		const str = this.ab2str(buffer);

		let tpl = document.createElement('template');
		tpl.innerHTML = str;
		requestAnimationFrame(() => {
			while (parent.firstChild) parent.firstChild.remove();
			parent.append(...tpl.content.children);
			tpl = null;
		})
	}

	ab2str(buf) {
		return String.fromCharCode.apply(null, new Uint16Array(buf));
	}

	init() {
		/*
		this.form.addEventListener('change', ({ target }) => {
			if (!target.matches('[data-state]')) return;
			this.worker.postMessage({
				state_id: target.value,
			});
			this.city = target
				.closest(this.container)
				.querySelector('[data-city]');
			if (this.city.value !== '') this.city.value = '';
		});

		this.worker.addEventListener('message', ({ data }) => {
			if (this.form.querySelector('[data-state]').value) {
				this.worker.postMessage({
					state_id: this.form.querySelector('[data-state]').value,
				});
			}
			requestAnimationFrame(() => {
				while (this.city.firstChild) this.city.firstChild.remove();
				this.city.insertAdjacentHTML(
					'beforeend',
					`<option value="" selected disabled></option>${data.response}`,
				);
				const city = this.city.getAttribute('value');
				if (city) this.city.value = city;
			});
		});
		*/
		this.worker.postMessage({
			file: this.file,
			fileType: this.type
		});

		this.worker.addEventListener('message', e => {
			const [status, buffer] = e.data;
			if (status.type !== 'TEMPLATE') return;
			this.render(buffer, this.city);
		}, true);

		const post = data => this.worker.postMessage(data);
		const stateSelector = this.selectors.state;

		this.form.addEventListener('change', e => e.target.closest(stateSelector) && post({ state_id: e.target.value }), true);

	}
}
