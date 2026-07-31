export interface ProjectSection {
	label: string;
	paragraphs: string[];
}

export interface Project {
	id: string;
	/** Ancla del slide de detalle. Debe ser único en todas las categorías. */
	slug: string;
	name: string;
	year: string;
	location: string;
	color: string;
	/** Frase corta bajo el título. Usa \n para forzar el salto de línea. */
	tagline?: string;
	services?: string[];
	sections?: ProjectSection[];
	/** Nota legal al pie de la página */
	note?: string;
}

export interface ProjectCategory {
	title: string;
	projects: Project[];
}

export const projectCategories: Record<string, ProjectCategory> = {
	branding: {
		title: 'BRANDING',
		projects: [
			{
				id: '01',
				slug: 'pitao',
				name: 'Pitao',
				year: '2026',
				location: 'Medellín, CO',
				color: '#ff5c0a',
				tagline: 'Comida rápida, pensada\npara la inmediatez.',
				services: ['Brand Strategy', 'Branding', 'Packaging', 'Retail Design'],
				sections: [
					{
						label: 'Objetivo',
						paragraphs: [
							'Crear una marca capaz de transmitir rapidez sin perder calidad visual y ser acompañado por un sistema gráfico flexible aplicado a empaque, punto de venta y comunicación digital.',
							'Pitao convierte la inmediatez en una experiencia con una estética bien cuidada y funcional. Es comida lista, bien pensada y presentada para seguir el ritmo de personas que van por la vida con intención.',
						],
					},
				],
				note: '*Proyecto diseñado a través de Enplanos, por lo tanto, todos los derechos de propiedad intelectual pertenecen a ellos.',
			},
			{
				id: '02',
				slug: 'level',
				name: 'Level',
				year: '2026',
				location: 'Medellín, CO',
				color: '#d70016',
			},
			{
				id: '03',
				slug: 'agua-de-kefir',
				name: 'Agua de kéfir',
				year: '2026',
				location: 'Medellín, CO',
				color: '#4a3c31',
			},
			{
				id: '04',
				slug: 'telegrama',
				name: 'Telegrama',
				year: '2026',
				location: 'Medellín, CO',
				color: '#000000',
			},
			{
				id: '05',
				slug: 'monsenor',
				name: 'Monseñor',
				year: '2026',
				location: 'Medellín, CO',
				color: '#006d44',
			},
			{
				id: '06',
				slug: 'artificio',
				name: 'Artificio',
				year: '2026',
				location: 'Medellín, CO',
				color: '#938c2a',
			},
			{
				id: '07',
				slug: 'salta',
				name: 'Salta',
				year: '2026',
				location: 'Medellín, CO',
				color: '#7f63d2',
			},
			{
				id: '08',
				slug: 'thc',
				name: 'THC',
				year: '2026',
				location: 'Medellín, CO',
				color: '#1d1a6a',
			},
		],
	},
};

export function getCategory(category: string): ProjectCategory | undefined {
	return projectCategories[category];
}

/** Hash del proyecto dentro de la profundidad de Work */
export function projectHref(project: Project): string {
	return `#${project.slug}`;
}

/** Categoría que contiene un proyecto, si existe */
export function findProjectCategory(slug: string): string | undefined {
	for (const [id, group] of Object.entries(projectCategories)) {
		if (group.projects.some((project) => project.slug === slug)) return id;
	}
	return undefined;
}

/**
 * Siguientes proyectos en el orden de la categoría del slug actual.
 * Avanza circularmente y excluye el proyecto actual.
 */
export function getNextProjects(slug: string, count = 3): Project[] {
	for (const group of Object.values(projectCategories)) {
		const index = group.projects.findIndex((project) => project.slug === slug);
		if (index === -1) continue;

		const pool = group.projects;
		if (pool.length <= 1) return [];

		const result: Project[] = [];
		for (let step = 1; step < pool.length && result.length < count; step += 1) {
			result.push(pool[(index + step) % pool.length]);
		}
		return result;
	}
	return [];
}
