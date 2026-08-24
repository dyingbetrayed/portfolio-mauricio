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
	/**
	 * Pantallas de imagen a pantalla completa, después de la descripción.
	 * Cada ruta es una pantalla distinta (ej. `/work/branding/pitao/2.jpg`).
	 */
	images?: string[];
}

export interface ProjectCategory {
	title: string;
	projects: Project[];
}

import categoriesData from '../content/categories.json';

const brandingFiles = import.meta.glob('../content/projects/branding/*.json', { eager: true });
const socialMediaFiles = import.meta.glob('../content/projects/social-media/*.json', { eager: true });
const flyersFiles = import.meta.glob('../content/projects/flyers/*.json', { eager: true });
const merchFiles = import.meta.glob('../content/projects/merch/*.json', { eager: true });

function mapProjects(files: Record<string, any>): Project[] {
	const projects = Object.entries(files).map(([path, data]) => {
		const slug = path.split('/').pop()?.replace('.json', '') || '';
		return { ...(data as any).default || data, slug } as Project;
	});
	projects.sort((a, b) => {
		if (!a.id || !b.id) return 0;
		return a.id.localeCompare(b.id);
	});
	return projects;
}

const brandingProjects = mapProjects(brandingFiles);
const socialMediaProjects = mapProjects(socialMediaFiles);
const flyersProjects = mapProjects(flyersFiles);
const merchProjects = mapProjects(merchFiles);

export const projectCategories: Record<string, ProjectCategory> = {
	branding: {
		title: categoriesData.branding_title || 'BRANDING',
		projects: brandingProjects
	},
	"social-media": {
		title: categoriesData.social_media_title || 'SOCIAL MEDIA',
		projects: socialMediaProjects
	},
	flyers: {
		title: categoriesData.flyers_title || 'FLYERS',
		projects: flyersProjects
	},
	merch: {
		title: categoriesData.merch_title || 'MERCH',
		projects: merchProjects
	}
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

/** Proyecto anterior y siguiente dentro de la misma categoría (circular). */
export function getAdjacentProjects(slug: string): { prev: Project | null; next: Project | null } {
	for (const group of Object.values(projectCategories)) {
		const index = group.projects.findIndex((p) => p.slug === slug);
		if (index === -1) continue;

		const pool = group.projects;
		if (pool.length <= 1) return { prev: null, next: null };

		const prev = pool[(index - 1 + pool.length) % pool.length];
		const next = pool[(index + 1) % pool.length];
		return { prev, next };
	}
	return { prev: null, next: null };
}
