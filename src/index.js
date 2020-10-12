class DynamicCityDropdown {
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
		this.worker.postMessage({
			type: 'START',
			file: this.file,
			fileType: this.type,
		});
	}

	defineWorker() {
		const cache = {
			active: false,
			states: {},
			templates: {},
		};

		const script =
			'const cache=' +
			JSON.stringify(cache) +
			';onmessage=' +
			(({ data }) => {
				if (data.type === 'START') {
					cache.type = data.fileType;
					return fetch(data.file)
						.then(async (resp) => {
							const output = {};
							const body =
								data.fileType == 'json'
									? await resp.json()
									: await resp.text();
							if (data.fileType === 'json') {
								for (let [state, cities] of Object.entries(
									body,
								)) {
									if (output[state] === undefined)
										output[state] = [];
									let i = 0,
										l = cities.length;

									for (; l > i++; )
										output[state].push(cities[i].city);

									output[state].sort();
								}

								return output;
							}
							// else handle csv file
							const rows = body.replace(/"/g, '').split('\n');
							let i = 1;
							l = rows.length;

							for (; l > i++; ) {
								// expects the first item in the CSV row to be the city name, and the second to be the state id (i.e. FL, IA, CA, etc...)
								if (rows[i] === '' || rows[i] === undefined)
									continue;
								const [city, id] = rows[i].split(',');

								if (id === undefined) continue;
								if (output[id] === undefined) output[id] = [];

								output[id].push(city);
							}

							for (let cities of Object.values(output))
								cities.sort();

							return output;
						})
						.then((output) => (cache.states = output))
						.then(() => (cache.active = true))
						.catch(console.error)
						.then(() => self.postMessage({ cacheStatus: true }));
				}

				if ('state_id' in data === false && data.state_id === undefined)
					throw 'Missing state_id';

				if (
					cache.templates[data.state_id] !== undefined &&
					cache.templates[data.state_id].length > 0
				) {
					return postMessage({
						response: cache.templates[data.state_id],
					});
				}

				cache.templates[data.state_id] = cache.states[data.state_id]
					.map(
						(cityName) =>
							`<option value="${cityName}" data-city-option>${cityName}</option>`,
					)
					.join('');

				postMessage({ response: cache.templates[data.state_id] });
			});
		return script;
	}

	init() {
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
			if (
				data.cacheStatus === true &&
				this.form.querySelector('[data-state]').value
			) {
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
	}
}
