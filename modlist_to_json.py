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

if __name__ == "__main__":
    """Main entry point of the script.

    Parses command-line arguments and calls the transform_server_txt_to_json function.

    Command-line arguments:
        input_file (str): Path to the input server.txt file.
        output_file (str): Path to the output JSON file.
        --remove-version (bool): Optional flag to remove the version field from the JSON output.
    """
    parser = argparse.ArgumentParser(description="Transform server.txt to JSON format.")
    parser.add_argument("input_file", help="Path to the input server.txt file.")
    parser.add_argument("output_file", help="Path to the output JSON file.")
    parser.add_argument("--remove-version", action="store_true", help="Remove the version field from the JSON output.")
    args = parser.parse_args()

    transform_server_txt_to_json(args.input_file, args.output_file, args.remove_version)
    print(f"JSON file created at: {args.output_file}")
