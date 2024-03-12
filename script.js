// Wait for the DOM content to be fully loaded before executing the script
document.addEventListener('DOMContentLoaded', () => {
    fetchRepositories(); // Initial call to fetch and display repositories
});

/**
 * Fetches repositories from GitHub API and displays them on the page.
 */
async function fetchRepositories() {
    const container = document.getElementById('repository-container'); // Container for repository tiles
    const response = await fetch('https://api.github.com/users/helloworldie/repos'); // Fetch repositories
    const repositories = await response.json(); // Parse the JSON response

    // Iterate over each repository and create a display tile
    repositories.forEach(async (repo) => {
        const tile = await createRepositoryTile(repo); // Create a tile for each repository
        container.appendChild(tile); // Append the tile to the container
    });
}

/**
 * Creates a tile element for a repository, including the featured image and a preview button.
 * @param {Object} repo - The repository object from GitHub's API.
 * @returns {Promise<HTMLElement>} The repository tile element.
 */
async function createRepositoryTile(repo) {
    const tile = document.createElement('div');
    tile.className = 'repository-tile';

    // Attempt to set a featured image or a placeholder
    const imageDiv = document.createElement('div');
    imageDiv.className = 'repository-image';
    await setImageBackground(imageDiv, repo);
    tile.appendChild(imageDiv);

    // Add the repository name to the tile
    const repoName = document.createElement('p');
    repoName.textContent = repo.name;
    tile.appendChild(repoName);

    // Attempt to create and add a preview button if applicable
    const previewButton = await createPreviewButton(repo);
    if (previewButton) tile.appendChild(previewButton);

    return tile;
}

/**
 * Sets the background of a div to the repository's featured image or a placeholder if the image doesn't exist.
 * @param {HTMLElement} div - The div to set the background image for.
 * @param {Object} repo - The repository object from GitHub's API.
 */
async function setImageBackground(div, repo) {
    const apiUrl = `https://api.github.com/repos/${repo.owner.login}/${repo.name}/contents/featured_image.png?ref=main`;

    try {
        const response = await fetch(apiUrl);
        if (response.ok) {
            const data = await response.json();
            div.style.backgroundImage = `url(${data.download_url})`;
        } else {
            throw new Error('Image not found');
        }
    } catch (error) {
        // Set a placeholder image if the featured image doesn't exist or an error occurs
        div.style.backgroundImage = `url('https://via.placeholder.com/200x200?text=${repo.name}')`;
    }
}

/**
 * Creates a preview button for a repository if it has a GitHub Pages site.
 * @param {Object} repo - The repository object from GitHub's API.
 * @returns {Promise<HTMLElement|null>} A button element or null if the repository does not have a GitHub Pages site.
 */
async function createPreviewButton(repo) {
    const githubPagesUrl = `https://${repo.owner.login}.github.io/${repo.name}/`;
    // Check if GitHub Pages site exists by attempting to fetch the index.html
    try {
        const response = await fetch(githubPagesUrl + 'index.html', { method: 'HEAD' });
        if (response.ok) {
            const button = document.createElement('button');
            button.className = 'preview-button';
            button.textContent = 'Preview';
            button.onclick = () => window.open(githubPagesUrl, '_blank');
            return button;
        } else {
            throw new Error('GitHub Pages site not found');
        }
    } catch (error) {
        // Return null if no GitHub Pages site exists or an error occurs
        return null;
    }
}
