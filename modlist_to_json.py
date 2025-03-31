import json
import argparse

def transform_server_txt_to_json(input_file, output_file, remove_version):
    """Transforms a server.txt file into a JSON file.

    Args:
        input_file (str): Path to the input server.txt file.
        output_file (str): Path to the output JSON file.
        remove_version (bool): If True, the version field will be removed from the JSON output.

    Raises:
        FileNotFoundError: If the input file does not exist.
        IOError: If there is an error reading or writing files.
    """
    mods = []
    with open(input_file, 'r') as file:
        for line in file:
            parts = line.strip().split('\t')
            if len(parts) == 3:
                name, version, mod_id = parts
                mod_entry = {
                    "modId": mod_id,
                    "name": name,
                    "version": "" if remove_version else version
                }
                mods.append(mod_entry)
    
    with open(output_file, 'w') as file:
        json.dump(mods, file, indent=4)

def compare_mods(server_file, json_file, output_file):
    """Compares mods from server.txt and a JSON file, and writes the diff to an output file.

    Args:
        server_file (str): Path to the server.txt file.
        json_file (str): Path to the JSON file.
        output_file (str): Path to the output file.

    Returns:
        dict: A dictionary containing added and removed mods.
    """
    # Load mods from server.txt
    server_mods = set()
    with open(server_file, 'r') as file:
        for line in file:
            parts = line.strip().split('\t')
            if len(parts) == 3:
                _, _, mod_id = parts
                server_mods.add(mod_id)

    # Load mods from JSON file
    with open(json_file, 'r') as file:
        json_data = json.load(file)
        json_mods = {mod['modId'] for mod in json_data.get('game', {}).get('mods', [])}

    # Determine added and removed mods
    added_mods = json_mods - server_mods
    removed_mods = server_mods - json_mods

    diff = {
        "added": list(added_mods),
        "removed": list(removed_mods)
    }

    # Write the diff to the output file
    with open(output_file, 'w') as file:
        json.dump(diff, file, indent=4)

    return diff

if __name__ == "__main__":
    """Main entry point of the script.

    Parses command-line arguments and calls the appropriate function.

    Command-line arguments:
        input_file (str): Path to the input server.txt file.
        output_file (str): Path to the output JSON file or diff file.
        --remove-version (bool): Optional flag to remove the version field from the JSON output.
        --compare (str): Optional flag to compare mods between server.txt and a JSON file.
    """
    parser = argparse.ArgumentParser(description="Transform server.txt to JSON format or compare mods.")
    parser.add_argument("input_file", help="Path to the input server.txt file.")
    parser.add_argument("output_file", help="Path to the output JSON file or diff file.")
    parser.add_argument("--remove-version", action="store_true", help="Remove the version field from the JSON output.")
    parser.add_argument("--compare", metavar="json_file", help="Compare mods between server.txt and a JSON file.")
    args = parser.parse_args()

    if args.compare:
        json_file = args.compare
        diff = compare_mods(args.input_file, json_file, args.output_file)
        print(f"Config diff created at: {args.output_file}")
        print(f"Mods added: {len(diff['added'])}, Mods removed: {len(diff['removed'])}")
    else:
        transform_server_txt_to_json(args.input_file, args.output_file, args.remove_version)
        print(f"JSON file created at: {args.output_file}")
