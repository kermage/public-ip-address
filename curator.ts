import { createReadStream, writeFileSync } from 'fs';
import { isIP } from 'net';
import { createInterface } from 'readline';

const randomize = (array: string[]) => {
    array.reverse().forEach((item: string, index: number) => {
        const j = Math.floor(Math.random() * (index + 1));
        [array[index], array[j]] = [array[j], array[index]];
    });

    return array;
}

const check = (url: string): Promise<Response> => fetch(url)
    .then((response: Response) => {
        if (200 !== response.status) {
            throw new Error(`${url} returned "${response.status}" with message "${response.statusText}"`)
        }

        return response
    })

const json = async () => {
    const online: Record<string, string> = {}
    const candidates = await import('./candidates.json')

    for await (const url of randomize(Object.keys(candidates.default))) {
		const key: string = candidates[url]

		await check(url)
			.then((response: Response) => response.json())
			.then((data: Record<string, string>) => {
				if (data[key] === undefined) {
					throw new Error(`${url} has response with "${key}" key not found`)
				}

				if (0 === isIP(data[key])) {
					throw new Error(`${url} has response with "${data[key]}" IP not valid`)
				}

				online[url] = key
			})
			.catch((error: Error) => {
				if ('Error' === error.name) {
					console.log(error.message)
				} else {
					console.log(`${url} ${error.message} caused by ${error.cause}`)
				}
			})
	}

    writeFileSync('online.json', JSON.stringify(online, null, 2), 'utf8')
	console.log('json', online)
}

const plain = async () => {
    const online: string[] = []
    const candidates = createInterface({
        input: createReadStream('candidates.txt'),
        crlfDelay: Infinity,
    });

    for await (const url of candidates) {
		await check(url)
			.then((response: Response) => response.text())
			.then((data: string) => {
				data = data.trim();

				if (0 === isIP(data)) {
					throw new Error(`${url} has response with "${data}" IP not valid`)
				}

				online.push(url)
			})
			.catch((error: Error) => {
				if ('Error' === error.name) {
					console.log(error.message)
				} else {
					console.log(`${url} ${error.message} caused by ${error.cause}`)
				}
			})
    }

    writeFileSync('online.txt', randomize(online).join("\n"), 'utf8')
	console.log('plain', online)
}

(async () => {
    await json()
    await plain()
})()
