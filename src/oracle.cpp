#include <SilkJS.h>
#include <occi.h>

using namespace oracle::occi;

struct ostate {
    Environment *environment;
    Connection *con;
};

static JSVAL connect(JSARGS args) {
    String::Utf8Value host(args[0]->ToString());
    String::Utf8Value user(args[1]->ToString());
    String::Utf8Value password(args[2]->ToString());
    String::Utf8Value db(args[3]->ToString());

    ostate *o = new ostate;
    o->environment = Environment::createEnvironment(Environment::DEFAULT);
    o->con = o->environment->createConnection(*user, *password, *db);
    return External::New(o);
}

static JSVAL close(JSARGS args) {
    ostate *o = (ostate *)JSEXTERN(args[0]);
    o->environment->terminateConnection(o->con);
	Environment::terminateEnvironment(o->env);
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
			names[n] = String::New(cols[n].getString(MetaData::ATTR_NAME));
			types[n] = cols[n].getInt(MetaData::ATTR_DATA_TYPE);
		}
		if (!r->next()) {
			s->closeResultSet(r);
			o->con->terminateStatement(s);
			return False();
		}
		JSOBJ obj = Object::New();
		for (int i=0; i<num_fields; i++) {
			if (r->isNull(i)) {
				o->Set(names[i], Null());
			}
			else {
				switch (types[i]) {
					case SQL_INT:
						o->Set(names[i], Number::New(r->getInt(i)));
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

/*
SQLTypes getSQLTypes(ub2 _oracleType) {
    switch( _oracleType ) {
        case SQLT_INT:
            return stInt;
        case SQLT_FLT:
        case SQLT_BDOUBLE:
            return stDouble;
        case SQLT_BFLOAT:
            return stFloat;
        case SQLT_ODT:
            return stDate;

        case SQLT_DATE:
        case SQLT_TIMESTAMP:
        case SQLT_TIMESTAMP_TZ:
        case SQLT_TIMESTAMP_LTZ:
            return stTimeStamp;

        case SQLT_CHR:
        case SQLT_NUM:
        case SQLT_STR:
        case SQLT_VCS:
        default:
            return stText;
    }
}
*/
