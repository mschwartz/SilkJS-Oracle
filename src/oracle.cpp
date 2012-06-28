#include <SilkJS.h>
#include <occi.h>

using namespace oracle::occi;

struct ostate {
    Environment *environment;
    Connection *con;
};

static JSVAL oracle_connect(JSARGS args) {
    String::Utf8Value host(args[0]->ToString());
    String::Utf8Value user(args[1]->ToString());
    String::Utf8Value password(args[2]->ToString());
    String::Utf8Value db(args[3]->ToString());

    ostate *o = new ostate;
    o->environment = Environment::createEnvironment(Environment::DEFAULT);
    o->con = o->environment->createConnection(*user, *password, *db);
    return External::New(o);
}

static JSVAL oracle_close(JSARGS args) {
    ostate *o = (ostate *)JSEXTERN(args[0]);
    o->environment->terminateConnection(o->con);
    delete o;
    return Undefined();
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