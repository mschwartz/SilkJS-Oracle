MODULE=MySQL

UNAME := $(shell uname -s)

ifeq ($(UNAME),Darwin)
    MAKEFILE=Makefile.osx
else
    MAKEFILE=Makefile
endif

all:
	cd src && make -f$(MAKEFILE)
	cp src/mysql_module.so lib

clean:
	cd src && make -f$(MAKEFILE) clean

realclean:
	cd src && make -f$(MAKEFILE) realclean

install:
	mkdir -p /usr/local/silkjs/contrib/$(MODULE)
	cp -rp index.js lib /usr/local/silkjs/contrib/$(MODULE)

uninstall:
	cd src && make -f$(MAKEFILE) uninstall
