import { getCollection, type CollectionEntry } from 'astro:content';

export type Project = CollectionEntry<'work'>;

/** Published projects in the order set by `order` in each file. */
export async function getProjects(): Promise<Project[]> {
  return (await getCollection('work', ({ data }) => !data.draft)).sort((a, b) => a.data.order - b.data.order);
}

/** Static paths for the case study pages, each with the project that follows it. */
export async function projectPaths() {
  const projects = await getProjects();
  return projects.map((project, i) => ({
    params: { slug: project.id },
    props: { project, next: projects[(i + 1) % projects.length] },
  }));
}
