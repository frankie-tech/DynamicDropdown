export default class DynamicCityDropdown {
	constructor(config) {
		this.form = config.form;
		this.file = config.file;
		this.container = config.container;
		this.city = this.form.querySelector('[data-city]');
		if (this.file === undefined) throw Error('Missing file path');
		this.type = config.type || 'csv';
		this.worker = new Worker(
			URL.createObjectURL(new Blob([`${this.defineWorker()}`])),
		);
		// this.worker.addEventListener('message', console.log);
		// console.log(this.worker);
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
					cache.states = await fetchIt(data);
					generator = templateGen();
					generator.next(data.state_id)
					postMessage([{ cacheStatus: 'resolved' }, '']);
					return;
				}

				function str2ab(str) {
					var buf = new ArrayBuffer(str.length * 2), // 2 bytes for each char
						bufView = new Uint16Array(buf),
						i = 0,
						l = str.length;

					for (; i < l; i++) bufView[i] = str.charCodeAt(i);
					return buf;
				}

				// turn long string into a transferable to transfer close to instantly
				const tpl = generator.next(data.state_id).value;
				const buffer = str2ab(tpl);
				// [ status: {}, data: [] ]
				return postMessage([{ type: 'TEMPLATE' }, buffer], [buffer]);

				async function fetchIt(data, bodyType = 'text') {
					cache.type = data.fileType;
					let output = {};
					const resp = await fetch(data.file),
						body = await resp[bodyType]();
					/*
					if (cache.type === 'json') {
						for
					}
					*/

					// else handle csv file
					const rows = body.replace(/"/g, '').split('\n'),
						l = rows.length;

					let i = 1;

					for (; l > i; i++) {
						if (rows[i] === '' || rows[i] === undefined) {
							continue;
						}

						// expects the first item in the CSV col to be the city name, and the second to be the state id (i.e. FL, IA, CA, etc...)

						const [city, id] = rows[i].split(',');

						if (id === undefined) continue;

						if (output[id] === undefined) {
							// console.log(id, output);
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
					while (true) {
						let request = yield response;

						if (cache.templates[request] === undefined || cache.templates[request].length === 0)
							cache.templates[request] = states[request].map(city => `<option value="${city}" data-city-option>${city}</option>`).join('');
						response = cache.templates[request];
					}
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
		console.log(str);
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
			fileType: this.type,
		});

		this.worker.onmessage = e => {
			console.log(e);
			const [status, buffer] = e.data;
			if (status.type !== 'TEMPLATE') return;
			this.render(buffer, this.city);
		}
	}

	set states([state, data]) {
		this.cache.states[state] = data;
		this.cache.templates[state] = data.map(city => `<option value="${city}" data-city-option>${city}</option>`).join('');
	}

	get states() {
		return this.cache.templates;
	}
}
