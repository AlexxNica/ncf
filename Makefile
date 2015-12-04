all: clean test doc

test:
	[ `id | cut -d\( -f2 | cut -d\) -f1` = 'root' ] || type fakeroot 2>/dev/null || { echo "Not running as root and fakeroot not found." ; exit 1 ; }
	cd tests/style/ && ./testall
	cd tests/unit/ && ./testall
	cd tests/acceptance/ && ./testall --info --no-network
	cd tests/acceptance/ && ./testall --info

doc:
	ls tree/30_generic_methods/*.cf | xargs egrep -h "^\s*bundle\s+agent\s+" | sed -r "s/\s*bundle\s+agent\s+//" | sort > doc/all_generic_methods.txt
	tools/ncf_doc.py

html: doc
	# To use this, run pip install pelican Markdown
	
	# Copy README.md and prefix it with metadata to make the site's index file
	echo "Title: A powerful and structured CFEngine framework" > site/content/index.md
	echo "URL: " >> site/content/index.md
	echo "save_as: index.html" >> site/content/index.md
	# Skip the first line (title that will be re-added by pelican)
	tail -n+2 README.md >> site/content/index.md

	# Copy reference data
	cp doc/generic_methods.md site/content/
	cp doc/generic_methods.html site/pelican-bootstrap3/templates/includes/
	cd site; make html

testsite: html
	cd site; make serve

clean:
	rm -rf tests/style/.succeeded
	rm -f tests/style/summary.log
	rm -f tests/style/test.log
	rm -f tests/style/test.xml
	rm -f tests/style/xml.tmp
	rm -rf tests/style/workdir/
	rm -rf tests/acceptance/.succeeded
	rm -f tests/acceptance/summary.log
	rm -f tests/acceptance/test.log
	rm -f tests/acceptance/test.xml
	rm -f tests/acceptance/xml.tmp
	rm -rf tests/acceptance/workdir/
	rm -f doc/all_generic_methods.txt
	rm -f doc/generic_methods.md
	find $(CURDIR) -name "*.[pP][yY][cC]" -exec rm "{}" \;

distclean: clean

.PHONY: all test doc clean distclean
