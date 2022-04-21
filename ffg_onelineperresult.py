#!/usr/bin/env python

from sys import argv
from os.path import isfile, basename

assert len(argv) == 4, "USAGE: `basename $0` dir query ext"
search_dir = argv[1]
query = argv[2]
ext = argv[3]

# search_dir = '/home/tsbertalan/Dropbox'
# query = 'well-posedness'
# ext = 'md'

from io import DEFAULT_BUFFER_SIZE
from functools import partial

# Amazingly, glob doesn't do streaming case insensitive search,
# so we have to do it ourselves. The answers here all did some dumb glob('*', recursive=True) thing: https://stackoverflow.com/questions/8151300
import subprocess
find_subproc = subprocess.Popen(['find', search_dir, '-iname', '*.{}'.format(ext)], stdout=subprocess.PIPE)

while True:
    path = find_subproc.stdout.readline()
    
    if path == '' and find_subproc.poll() != None:
        break

    # Switch to str.
    path = path.decode('utf-8')[:-1]

    # Read the file.
    if query in basename(path):
        print(path)

    else:

        if isfile(path):
            with open(path, 'rb') as f:
                # Read the file as UTF8, ignoring errors.
                doc = []
                reader = partial(f.read1, DEFAULT_BUFFER_SIZE)
                file_iterator = iter(reader, bytes())
                for chunk in file_iterator:
                    doc.append(chunk.decode('utf-8', 'ignore'))
                contents = ''.join(doc)

                if query in contents:
                    print(path)

    # Make sure that we quit when the process is done.
    if find_subproc.poll() != None:
        break
