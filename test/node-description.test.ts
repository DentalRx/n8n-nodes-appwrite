import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { AppwriteApi } from '../credentials/AppwriteApi.credentials';
import { description, node, resolveParameters, testNode } from './helpers/mock-context';

const { properties } = description;

const resourceProperty = properties.find((property) => property.name === 'resource');
const resources = ((resourceProperty?.options ?? []) as INodePropertyOptions[]).map(
	(option) => option.value as string,
);

function operationProperties(resource: string): INodeProperties[] {
	return properties.filter(
		(property) =>
			property.name === 'operation' &&
			(property.displayOptions?.show?.resource as string[] | undefined)?.includes(resource),
	);
}

export function operationsOf(resource: string): string[] {
	const [property] = operationProperties(resource);
	return ((property?.options ?? []) as INodePropertyOptions[]).map(
		(option) => option.value as string,
	);
}

/** The top-level properties n8n shows for a node configured with `values`. */
export function visibleProperties(values: Record<string, string>): INodeProperties[] {
	const resolved = resolveParameters(values);
	return properties.filter((property) =>
		NodeHelpers.displayParameter(resolved, property, testNode, description),
	);
}

const staticOptionValues = (property: INodeProperties): unknown[] =>
	((property.options ?? []) as INodePropertyOptions[]).map((option) => option.value);

describe('node metadata', () => {
	it('declares what n8n needs to list, load and run the node', () => {
		expect(description.name).toBe('appwrite');
		expect(description.displayName).toBe('Appwrite');
		expect(description.version).toBe(1);
		expect(description.group).toEqual(['transform']);
		expect(description.defaults).toEqual({ name: 'Appwrite' });
		expect(description.icon).toEqual({
			light: 'file:appwrite.svg',
			dark: 'file:appwrite.dark.svg',
		});
		expect(description.inputs).toHaveLength(1);
		expect(description.outputs).toHaveLength(1);
		expect(description.usableAsTool).toBe(true);
		expect(description.subtitle).toContain('$parameter["operation"]');
		expect(description.codex?.categories?.length).toBeGreaterThan(0);
		expect(description.codex?.resources?.primaryDocumentation?.[0]?.url).toMatch(/^https:\/\//);
	});

	it('requires the credential type this package ships', () => {
		const credential = new AppwriteApi();
		expect(description.credentials).toEqual([{ name: credential.name, required: true }]);
	});

	it('defaults the resource selector to one of its options', () => {
		expect(resourceProperty).toBeDefined();
		expect(resources.length).toBeGreaterThan(0);
		expect(resources).toContain(resourceProperty?.default);
	});

	it('lists resources and their options alphabetically', () => {
		const names = ((resourceProperty?.options ?? []) as INodePropertyOptions[]).map((o) => o.name);
		expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
	});
});

describe.each(resources)('resource "%s"', (resource) => {
	const operations = operationsOf(resource);

	it('has exactly one operation selector, defaulting to one of its operations', () => {
		const [property, ...rest] = operationProperties(resource);
		expect(rest).toHaveLength(0);
		expect(property.displayOptions?.show?.resource).toEqual([resource]);
		expect(property.noDataExpression).toBe(true);
		expect(operations.length).toBeGreaterThan(0);
		expect(operations).toContain(property.default);
	});

	it('describes every operation with a description and an action', () => {
		const [property] = operationProperties(resource);
		for (const option of property.options as INodePropertyOptions[]) {
			expect(option.description, `${resource}.${option.value} description`).toBeTruthy();
			expect(option.action, `${resource}.${option.value} action`).toBeTruthy();
		}
	});

	it.each(operations)('shows a unique set of parameters for operation "%s"', (operation) => {
		const names = visibleProperties({ resource, operation }).map((property) => property.name);
		const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
		expect(duplicates).toEqual([]);
		expect(names).toContain('operation');
	});

	if (operations.includes('getMany')) {
		it('offers Return All and Limit on Get Many', () => {
			const names = visibleProperties({ resource, operation: 'getMany' }).map((p) => p.name);
			expect(names).toContain('returnAll');
			expect(names).toContain('limit');
		});
	}
});

describe('property references', () => {
	const walk = (list: INodeProperties[], visit: (property: INodeProperties) => void): void => {
		for (const property of list) {
			visit(property);
			if (property.type === 'collection') walk(property.options as INodeProperties[], visit);
			if (property.type === 'fixedCollection') {
				for (const group of property.options ?? []) {
					walk((group as { values: INodeProperties[] }).values, visit);
				}
			}
		}
	};

	it('only reference resources and operations that exist', () => {
		for (const property of properties) {
			const show = property.displayOptions?.show ?? {};
			const shownResources = (show.resource ?? []) as string[];
			for (const resource of shownResources) {
				expect(resources, `${property.name} references resource "${resource}"`).toContain(resource);
			}
			for (const operation of (show.operation ?? []) as string[]) {
				const known = shownResources.some((resource) => operationsOf(resource).includes(operation));
				expect(known, `${property.name} references operation "${operation}"`).toBe(true);
			}
		}
	});

	it('only reference load options methods the node implements', () => {
		const implemented = Object.keys(node.methods.loadOptions);
		const topLevelNames = new Set(properties.map((property) => property.name));
		walk(properties, (property) => {
			const method = property.typeOptions?.loadOptionsMethod;
			if (method !== undefined) {
				expect(implemented, `${property.name} uses ${method}`).toContain(method);
			}
			for (const dependency of property.typeOptions?.loadOptionsDependsOn ?? []) {
				expect(topLevelNames, `${property.name} depends on ${dependency}`).toContain(dependency);
			}
		});
	});

	it('default every options field to one of its values', () => {
		walk(properties, (property) => {
			if (property.type === 'options' && property.typeOptions?.loadOptionsMethod === undefined) {
				expect(staticOptionValues(property), `${property.name} default`).toContain(
					property.default,
				);
			}
			if (property.type === 'multiOptions') {
				for (const value of property.default as unknown[]) {
					expect(staticOptionValues(property), `${property.name} default`).toContain(value);
				}
			}
		});
	});

	it('name every parameter in lowerCamelCase without collisions across types', () => {
		const typesByName = new Map<string, Set<string>>();
		for (const property of properties) {
			expect(property.name).toMatch(/^[a-z][A-Za-z0-9]*$/);
			const types = typesByName.get(property.name) ?? new Set<string>();
			types.add(property.type);
			typesByName.set(property.name, types);
		}
		// The same name may be declared several times for different operations,
		// but a name must always mean the same kind of value. The one accepted
		// pair is a picker for an existing record next to a free-text field for
		// the ID of a record being created, which both resolve to an ID string.
		const idPair = new Set(['options', 'string']);
		for (const [name, types] of typesByName) {
			if (name === 'options') continue;
			const unexpected = [...types].filter((type) => !idPair.has(type));
			if (types.size > 1) expect(unexpected, `parameter "${name}" mixes types`).toEqual([]);
		}
	});
});
