const defaultProfile = {
  name: 'Ragwar Fintech',
  tagline: 'Ethical investment research and paper portfolio analytics',
  overview: 'Ragwar Fintech develops research tools for screening investments, evaluating portfolio construction, and measuring performance against documented benchmarks.',
  researchFocus: 'The Ethical Investments Platform brings together company and fund research, benchmark comparisons, and documented screening decisions. Experiment 001 uses hypothetical capital to study a balanced equity, bond, and cash allocation.',
  methodology: 'Record sources, assumptions, and methodology versions alongside research conclusions. Use verified, aligned total-return observations for comparisons and route exceptions to human review.',
};

async function getResearchProfile(env) {
  const fallback = {profile: defaultProfile, source: 'built-in'};
  const {CONTENTFUL_SPACE_ID: space, CONTENTFUL_DELIVERY_TOKEN: token, CONTENTFUL_PROFILE_ENTRY_ID: entry} = env;
  const environment = env.CONTENTFUL_ENVIRONMENT || 'master';
  if (!space || !token || !entry) return fallback;

  try {
    const path = [space, environment, entry].map(encodeURIComponent);
    const response = await fetch(
      `https://cdn.contentful.com/spaces/${path[0]}/environments/${path[1]}/entries/${path[2]}`,
      {
        headers: {Authorization: `Bearer ${token}`},
        redirect: 'error',
        signal: AbortSignal.timeout(3500),
      },
    );
    if (!response.ok) return fallback;
    const {fields, sys} = await response.json();
    if (sys?.contentType?.sys?.id !== 'researchProfile' || !fields) return fallback;
    const profile = {};
    for (const key of Object.keys(defaultProfile)) {
      if (typeof fields[key] !== 'string' || !fields[key].trim()) return fallback;
      profile[key] = fields[key].trim();
    }
    return {profile, source: 'contentful'};
  } catch {
    return fallback;
  }
}
