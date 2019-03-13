#!/usr/bin/env python

import pymongo

if __name__ == '__main__':
    myclient = pymongo.MongoClient("mongodb://localhost:27017/")
    mydb = myclient["javbus"]
    mycol = mydb["actress"]
    with open("./allactressmovie.sh","w") as f:
        for x in mycol.find():
            f.write("jav -a -o /Volumes/PhiHardisk\ H1/javbus -b https://www.javbus.com/star/"+ x["maskCode"]+"\n")

