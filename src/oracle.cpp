#include <SilkJS.h>
#include <occi.h>

// using namespace oracle::occi;
//#define Environment oracle::occi::Environment
#define Connection oracle::occi::Connection
#define MetaData oracle::occi::MetaData
#define Statement oracle::occi::Statement
#define ResultSet oracle::occi::ResultSet
#define SQLException oracle::occi::SQLException
#define Stream oracle::occi::Stream
#define Clob oracle::occi::Clob
#define OCCI_LOB_READONLY oracle::occi::OCCI_LOB_READONLY

struct ostate {
    oracle::occi::Environment *environment;
    Connection *con;
};

static JSVAL connect(JSARGS args) {
    String::Utf8Value host(args[0]->ToString());
    String::Utf8Value user(args[1]->ToString());
    String::Utf8Value password(args[2]->ToString());
    String::Utf8Value db(args[3]->ToString());

    ostate *o = new ostate;
	try {
		o->environment = oracle::occi::Environment::createEnvironment(oracle::occi::Environment::THREADED_MUTEXED);
	    o->con = o->environment->createConnection(*user, *password, *db);
	}
	catch (SQLException &e) {
		delete o;
        return ThrowException(String::New(e.what()));
	}
    return External::New(o);
}

static JSVAL close(JSARGS args) {
    ostate *o = (ostate *)JSEXTERN(args[0]);
    o->environment->terminateConnection(o->con);
	oracle::occi::Environment::terminateEnvironment(o->environment);
    delete o;
    return Undefined();
}

static JSVAL getDataRow(JSARGS args) {
	ostate *o = (ostate *)JSEXTERN(args[0]);
	String::Utf8Value query(args[1]->ToString());
	Statement *s = NULL;
	ResultSet *r = NULL;

	try {
		s = o->con->createStatement(*query);
		r = s->executeQuery();
		vector<MetaData>cols = r->getColumnListMetaData();
		int num_fields = cols.size();
		Local<String> names[num_fields];
		int types[num_fields];
		for (int n=0; n<num_fields; n++) {
			names[n] = String::New(cols[n].getString(MetaData::ATTR_NAME).c_str());
			types[n] = cols[n].getInt(MetaData::ATTR_DATA_TYPE);
		}
		if (!r->next()) {
			s->closeResultSet(r);
			o->con->terminateStatement(s);
			return False();
		}
		JSOBJ obj = Object::New();
		for (int i=0; i<num_fields; i++) {
			if (r->isNull(i+1)) {
				obj->Set(names[i], Null());
			}
			else {
				switch (types[i]) {
					case SQLT_INT:
						obj->Set(names[i], Number::New(r->getInt(i+1)));
						break;
                    case SQLT_NUM:
                    case SQLT_FLT:
                    case SQLT_BDOUBLE:
                        obj->Set(names[i], Number::New(r->getDouble(i+1)));
                        break;
                    default:
                        obj->Set(names[i], String::New(r->getString(i+1).c_str()));
                        break;
				}
			}
		}
		s->closeResultSet(r);
		o->con->terminateStatement(s);
		return obj;
	}
	catch (SQLException &e) {
		if (r) {
			s->closeResultSet(r);
		}
		if (s) {
			o->con->terminateStatement(s);
		}
		return ThrowException(String::New(e.what()));
	}
}

static JSVAL getDataRows(JSARGS args) {
    ostate *o = (ostate *)JSEXTERN(args[0]);
    String::Utf8Value query(args[1]->ToString());
    Statement *s = NULL;
    ResultSet *r = NULL;

    try {
        s = o->con->createStatement(*query);
        r = s->executeQuery();
        vector<MetaData>cols = r->getColumnListMetaData();
        int num_fields = cols.size();

        Local<String> names[num_fields];
        int types[num_fields];
        for (int n=0; n<num_fields; n++) {
            names[n] = String::New(cols[n].getString(MetaData::ATTR_NAME).c_str());
            types[n] = cols[n].getInt(MetaData::ATTR_DATA_TYPE);
        }
        Handle<Array>a = Array::New();
        int ndx = 0;
        while (r->next()) {
            JSOBJ obj = Object::New();
            for (int i=0; i<num_fields; i++) {
                if (false && r->isNull(i+1)) {
                    obj->Set(names[i], Null());
                }
                else {
                    switch (types[i]) {
                        case SQLT_INT:
                            obj->Set(names[i], Number::New(r->getInt(i+1)));
                            break;
                        case SQLT_NUM:
                        case SQLT_FLT:
                        case SQLT_BDOUBLE:
							obj->Set(names[i], Number::New(r->getDouble(i+1)));
							break;
						case SQLT_CLOB:
							{
								Clob clob = r->getClob(i+1);
								clob.open(OCCI_LOB_READONLY);
								int len = clob.length();
								Stream *stream = clob.getStream();
								char *buffer = new char[len];
								stream->readBuffer(buffer, len);
								obj->Set(names[i], String::New(buffer, len));
								clob.closeStream(stream);
								clob.close();
								delete [] buffer;
							}
							break;
                        default:
                            obj->Set(names[i], String::New(r->getString(i+1).c_str()));
                            break;
                    }
                }
            }
            a->Set(ndx++, obj);
        }
        s->closeResultSet(r);
        o->con->terminateStatement(s);
        return a;
    }
    catch (SQLException &e) {
        if (r) {
            s->closeResultSet(r);
        }
        if (s) {
            o->con->terminateStatement(s);
        }
        return ThrowException(String::New(e.what()));
    }
}

static JSVAL getScalar(JSARGS args) {
    ostate *o = (ostate *)JSEXTERN(args[0]);
    String::Utf8Value query(args[1]->ToString());
    Statement *s = NULL;
    ResultSet *r = NULL;

    try {
        s = o->con->createStatement(*query);
        r = s->executeQuery();
        vector<MetaData>cols = r->getColumnListMetaData();
        int num_fields = cols.size();
        Local<String> names[num_fields];
        int types[num_fields];
        for (int n=0; n<num_fields; n++) {
            names[n] = String::New(cols[n].getString(MetaData::ATTR_NAME).c_str());
            types[n] = cols[n].getInt(MetaData::ATTR_DATA_TYPE);
        }
        if (!r->next()) {
            s->closeResultSet(r);
            o->con->terminateStatement(s);
            return False();
        }
        Handle<Value> v;
        if (r->isNull(1)) {
            v = Null();
        }
        else {
            switch (types[0]) {
                case SQLT_INT:
                    v = Number::New(r->getInt(1));
                    break;
                case SQLT_NUM:
                case SQLT_FLT:
                case SQLT_BDOUBLE:
                    v = Number::New(r->getDouble(1));
                    break;
				case SQLT_CLOB:
					{
						Clob clob = r->getClob(1);
						clob.open(OCCI_LOB_READONLY);
						int len = clob.length();
						Stream *stream = clob.getStream();
						char *buffer = new char[len];
						stream->readBuffer(buffer, len);
						v = String::New(buffer, len);
						clob.closeStream(stream);
						clob.close();
						delete [] buffer;
					}
					break;
                default:
                    v = String::New(r->getString(1).c_str());
                    break;
            }
        }
        s->closeResultSet(r);
        o->con->terminateStatement(s);
        return v;
    }
    catch (SQLException &e) {
        if (r) {
            s->closeResultSet(r);
        }
        if (s) {
            o->con->terminateStatement(s);
        }
        return ThrowException(String::New(e.what()));
    }
}

static JSVAL update(JSARGS args) {
    ostate *o = (ostate *)JSEXTERN(args[0]);
    String::Utf8Value query(args[1]->ToString());
	bool b = args[2]->BooleanValue();
    Statement *s = NULL;
    try {
        s = o->con->createStatement();
		s->setAutoCommit(b);
        int n = s->executeUpdate(*query);
        o->con->terminateStatement(s);
        return Integer::New(n);
    }   
    catch (SQLException &e) {
        if (s) {
            o->con->terminateStatement(s);
        }
        return ThrowException(String::New(e.what()));
    } 
}

extern "C" JSOBJ getExports() {
    JSOBJT o = ObjectTemplate::New();
    o->Set(String::New("connect"), FunctionTemplate::New(connect));
    o->Set(String::New("close"), FunctionTemplate::New(close));
    o->Set(String::New("getDataRow"), FunctionTemplate::New(getDataRow));
    o->Set(String::New("getDataRows"), FunctionTemplate::New(getDataRows));
    o->Set(String::New("getScalar"), FunctionTemplate::New(getScalar));
    o->Set(String::New("update"), FunctionTemplate::New(update));
    return o->NewInstance();
}
