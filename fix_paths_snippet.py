
@app.route('/api/fix_paths', methods=['GET'])
@requires_auth
def fix_beta_paths():
    """
    One-time utility to fix broken paths in data.js
    Problem: beta user uploads were saved as 'beta_xxx/img.webp' instead of 'user_images/beta_xxx/img.webp'
    """
    try:
        data = load_data()
        new_data = []
        fixed_count = 0
        seen_keys = set()
        
        for item in data:
            folder = item.get('folder', '')
            image = item.get('image', '')
            
            # Key for deduplication
            key = f"{folder}|{image}"
            
            # Fix Logic
            if folder.startswith('beta_') and not folder.startswith(USER_IMAGES_DIR):
                new_folder = os.path.join(USER_IMAGES_DIR, folder).replace('\\', '/')
                item['folder'] = new_folder
                fixed_count += 1
                key = f"{new_folder}|{image}" # Update key
                
            if key not in seen_keys:
                seen_keys.add(key)
                new_data.append(item)
                
        if fixed_count > 0:
            save_data(new_data)
            return jsonify({'success': True, 'msg': f'Fixed {fixed_count} paths and deduplicated DB.'})
        else:
            return jsonify({'success': True, 'msg': 'No paths needed fixing.'})
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500
