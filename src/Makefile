OBJ=oracle.o

V8LIB_DIR=/usr/local/silkjs/src/v8

V8LIB_DIR=/usr/local/silkjs/src/v8

V8=	$(V8LIB_DIR)/libv8_base.a $(V8LIB_DIR)/libv8_snapshot.a

SDK=instantclient_11_2/sdk

CCFLAGS=-fPIC -I/usr/local/silkjs/src -I$(V8LIB_DIR)/include -I$(SDK)/include

.cpp.o:
	g++ -c $(CCFLAGS) -o $*.o $*.cpp

all:	$(OBJ)
	gcc -shared -Wl,-soname,oracle_module.so -o oracle_module.so $(OBJ) -Linstantclient_11_2 -locci -L$(V8LIB_DIR) -lv8 

clean:
	rm -f src/*.o src/*.so oracle_module.so

realclean:
	rm -f src/*.o src/*.so oracle_module.so
