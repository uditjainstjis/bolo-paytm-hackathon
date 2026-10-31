# Re-sync a variant from the latest public/ and re-apply its Bolo layer. usage: python3 build.py c-character|d-native
import re, subprocess, sys, os
v = sys.argv[1]; here = os.path.dirname(os.path.abspath(__file__)); pub = os.path.dirname(here); dst = os.path.join(here, v)
subprocess.run(['rsync', '-a', '--exclude', 'variants', pub + '/', dst + '/'], check=True)
p = os.path.join(dst, 'index.html'); s = open(p).read()
a, b = s.index('  <button id="scanqr"'), s.index('  <button id="logbtn"')
s = s[:a] + open(os.path.join(dst, '_layer.html')).read() + s[b:]
s = re.sub(r'(<link rel="stylesheet" href="style.css\?v=\d+">)', r'\1<link rel="stylesheet" href="variant.css?v=' + str(int(os.path.getmtime(os.path.join(dst, 'variant.css')))) + '">', s)
s = re.sub(r'(<script src="app.js\?v=\d+"></script>)', r'\1<script src="variant.js?v=' + str(int(os.path.getmtime(os.path.join(dst, 'variant.js')))) + '"></script>', s)
s = s.replace('<title>Paytm · Bolo concept</title>', '<title>Paytm · Bolo · ' + v + '</title>')
open(p, 'w').write(s); print('built', v)
