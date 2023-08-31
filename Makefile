all: jik-tweaks.xpi

clean: ; -rm -f jik-tweaks.xpi

jik-tweaks.xpi: manifest.json background.js options.html options.js
	rm -f $@.tmp $@
	zip -r $@.tmp $^
	mv $@.tmp $@
