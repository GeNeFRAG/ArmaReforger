import requests
import json
from bs4 import BeautifulSoup
import sys
import urllib3

# Disable SSL verification warnings.
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


def extract_meta_content(html, meta_name):
    """Extracts the content of a meta tag with a specific property from the HTML.

    Args:
        html (str): The HTML content of the page.
        meta_name (str): The name of the meta property to extract.

    Returns:
        str: The content of the meta tag, or None if not found.
    """
    soup = BeautifulSoup(html, 'html.parser')
    meta_tag = soup.find("meta", {"property": f"og:{meta_name}"})
    return meta_tag["content"] if meta_tag else None


def extract_dependencies(html):
    """Extracts the list of dependencies (mod IDs) from the HTML of a mod's workshop page.

    Args:
        html (str): The HTML content of the page.

    Returns:
        list: A list of mod IDs representing the dependencies.
    """
    soup = BeautifulSoup(html, 'html.parser')
    dependencies_section = soup.find("section", {"class": "py-8"})
    if not dependencies_section:
        return []
    dependency_links = dependencies_section.find_all("a", {"class": "bg-black/75"})
    return [link["href"].split("/")[-1].split("-")[0] for link in dependency_links]


def fetch_mod_details(mod_id, visited):
    """Recursively fetches details of a mod and its dependencies.

    Args:
        mod_id (str): The ID of the mod to fetch.
        visited (set): A set of already visited mod IDs to avoid duplication.

    Returns:
        list: A list of dictionaries containing mod details.
    """
    if mod_id in visited:
        return []
    visited.add(mod_id)

    url = f"https://reforger.armaplatform.com/workshop/{mod_id}"
    response = requests.get(url, verify=False)
    if response.status_code != 200:
        print(f"Failed to fetch mod {mod_id}")
        return []

    html = response.text
    mod_name = extract_meta_content(html, "title")
    dependencies = extract_dependencies(html)

    mod_data = {
        "modId": mod_id,
        "name": mod_name,
        "version": ""  # Version information is currently not extracted.
    }

    all_mods = [mod_data]
    for dependency_id in dependencies:
        all_mods.extend(fetch_mod_details(dependency_id, visited))

    return all_mods


def main():
    """Main entry point of the script."""
    if len(sys.argv) < 2:
        print("Usage: python extract_mods.py <mod_id>")
        sys.exit(1)

    root_mod_id = sys.argv[1]
    visited_mods = set()
    mods = fetch_mod_details(root_mod_id, visited_mods)

    with open("mods.json", "w") as f:
        json.dump(mods, f, indent=4)

    print("Mod details and dependencies saved to mods.json")


if __name__ == "__main__":
    main()
