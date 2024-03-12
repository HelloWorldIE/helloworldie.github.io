// Wait for the DOM to fully load before executing
document.addEventListener('DOMContentLoaded', () => {
    fetchRepositories(); // Call the function to start fetching repositories
});

// Fetches repositories for a specified user
async function fetchRepositories() {
    const container = document.getElementById('repository-container');
    // Fetch repositories from GitHub API
    const response = await fetch('https://api.github.com/users/helloworldie/repos');
    const repositories = await response.json(); // Parse the JSON response

    // Iterate over each repository
    for (const repo of repositories) {
        // Create a new div element for this repository
        const tile = document.createElement('div');
        tile.className = 'repository-tile';

        // Attempt to load a featured image for the repository
        const imageName = 'featured_image.png';
        const imageUrl = `${repo.html_url}/raw/main/${imageName}`;
        const imageExists = await imageExistsOnRepo(imageUrl);

        // If the image exists, display it
        if (imageExists) {
            const image = document.createElement('div');
            image.className = 'repository-image';
            image.style.backgroundImage = `url('${imageUrl}')`;
            tile.appendChild(image);
        }

        // Display the repository's name
        const repoName = document.createElement('p');
        repoName.textContent = repo.name;
        tile.appendChild(repoName);

        // Check if index.html exists for previewing
        const indexHtmlUrl = `${repo.html_url}/blob/main/index.html`;
        const indexHtmlExists = await imageExistsOnRepo(indexHtmlUrl.replace('/blob/', '/raw/')); // Using raw URL for checking

        // If index.html exists, add a preview button
        if (indexHtmlExists) {
            const previewButton = document.createElement('button');
            previewButton.className = 'preview-button';
            previewButton.textContent = 'Preview';
            previewButton.onclick = () => openPreview(indexHtmlUrl); // Function to handle preview
            tile.appendChild(previewButton);
        }

        // Add the completed tile to the container
        container.appendChild(tile);
    }
}

// Checks if a given URL for an image or file exists
async function imageExistsOnRepo(url) {
    try {
        // Perform a HEAD request to check for the file's existence
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok; // true if status is 200-299
    } catch (error) {
        return false;
    }
}

// Opens a preview of the repository's index.html in a new tab
function openPreview(url) {
    const previewWindow = window.open('', '_blank'); // Open a new blank tab
    previewWindow.location = url.replace('/blob/', '/raw/'); // Adjust URL for direct access
}
