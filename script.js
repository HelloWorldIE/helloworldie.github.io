// Ensure the DOM is fully loaded before executing
document.addEventListener('DOMContentLoaded', () => {
    fetchRepositories();
});

/**
 * Fetches the GitHub repositories for the specified user and displays them.
 */
async function fetchRepositories() {
    const container = document.getElementById('repository-container');
    const response = await fetch('https://api.github.com/users/helloworldie/repos');
    const repositories = await response.json();

    repositories.forEach(async (repo) => {
        const tile = createRepositoryTile(repo);
        container.appendChild(tile);
    });
}

/**
 * Creates a tile for a repository.
 * @param {Object} repo The repository object from GitHub's API.
 * @returns {HTMLElement} The repository tile element.
 */
function createRepositoryTile(repo) {
    const tile = document.createElement('div');
    tile.className = 'repository-tile';

    // Feature image handling
    const imageName = 'featured_image.png';
    const imageUrl = `${repo.html_url}/raw/main/${imageName}`;
    const imageDiv = document.createElement('div');
    imageDiv.className = 'repository-image';
    setImageBackground(imageDiv, imageUrl, repo.name).then(() => tile.appendChild(imageDiv));

    const repoName = document.createElement('p');
    repoName.textContent = repo.name;
    tile.appendChild(repoName);

    // Preview button for GitHub Pages
    const githubPagesUrl = `https://${repo.owner.login}.github.io/${repo.name}/`;
    createPreviewButton(githubPagesUrl).then((button) => {
        if (button) tile.appendChild(button);
    });

    return tile;
}

/**
 * Attempts to set an image background, falling back to a placeholder if the image doesn't exist.
 * @param {HTMLElement} div The div to set the background image for.
 * @param {string} imageUrl The URL of the image to set as the background.
 * @param {string} repoName The name of the repository for placeholder generation.
 */
async function setImageBackground(div, imageUrl, repoName) {
    const imageExists = await imageExistsOnRepo(imageUrl);
    if (imageExists) {
        div.style.backgroundImage = `url('${imageUrl}')`;
    } else {
        // Placeholder logic can be enhanced with a dynamic image generator
        div.className = 'placeholder-image';
        div.style.backgroundImage = `url('https://via.placeholder.com/200x200?text=${repoName}')`;
    }
}

/**
 * Checks if an image or file exists at the specified URL.
 * @param {string} url The URL to check.
 * @returns {Promise<boolean>} True if the image exists, false otherwise.
 */
async function imageExistsOnRepo(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch (error) {
        return false;
    }
}

/**
 * Creates a preview button if an index.html exists in the repository's GitHub Pages.
 * @param {string} githubPagesUrl The GitHub Pages URL of the repository.
 * @returns {Promise<HTMLElement|null>} The button element or null if index.html doesn't exist.
 */
async function createPreviewButton(githubPagesUrl) {
    const indexHtmlExists = await imageExistsOnRepo(`${githubPagesUrl}index.html`);
    if (indexHtmlExists) {
        const button = document.createElement('button');
        button.className = 'preview-button';
        button.textContent = 'Preview';
        button.onclick = () => window.open(githubPagesUrl, '_blank');
        return button;
    }
    return null;
}
