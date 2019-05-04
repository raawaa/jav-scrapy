#!/usr/bin/env python

import pymongo
import bson
import re
import string
from optparse import OptionParser
import json

count = 0
# 0代表准确fanhao，1代表title中的关键词，2代表演员，3代表系列番号


def selectmag(maglist):
    '''选择最优磁力链接'''
    orders=0
    best=maglist[0]
    for i in maglist:
        if "7sht.me" in i and (i[-2:]=="-C" or i[-2:]=="-c"):
            return i
        elif "_CAVI" in i or i[-2:]=="-C" or i[-2:]=="-c":
            if len(i.split("%")) <= 3:
                return i
        elif i[-1:]=="C" or i[-1:]=="R":
            if len(i.split("%")) <= 3:
                return i
        elif "44x.me" in i:
            best = i
            orders = 4
        elif orders<3 and ("Thz.la" in i or "tha.la" in i):
            best = i
            orders = 3
        elif orders<2 and ("FHD" in i or "fhd" in i):
            best = i
            orders = 2
        elif orders<1 and ("HD" in i or "hd" in i):
            orders = 1
            best = i
    return best

def new_selectmag(maglist):
    '''只查找中文字幕'''
    orders=0
    best=maglist[0]
    for i in maglist:
        if "7sht.me" in i and (i[-2:]=="-C" or i[-2:]=="-c"):
            return i
        elif "_CAVI" in i or i[-2:]=="-C" or i[-2:]=="-c":
            if len(i.split("%")) <= 3:
                return i
        elif i[-1:]=="C" or i[-1:]=="R":
            if len(i.split("%")) <= 3:
                return i
    return None

def findseries(fanhao):
    '''查找系列'''
    restring = fanhao.upper()+".*"
    pattern = re.compile(restring)
    regex = bson.regex.Regex.from_native(pattern)
    regex.flags ^= re.UNICODE
    condition = {'fanhao': regex}
    result = mycol.find(condition)
    return result

def findintitle(keyword):
    '''查找系列'''
    restring = "^.*"+keyword+".*$"
    pattern = re.compile(restring)
    regex = bson.regex.Regex.from_native(pattern)
    regex.flags ^= re.UNICODE
    condition = {'title': regex}
    result = mycol.find(condition)
    return result

def findactress(actress):
    '''查找演员'''
    condition = {"actress": actress}
    result = mycol.find(condition)
    return result
def findfanhao(fanhao):
    '''查找番号'''
    condition = {"fanhao": fanhao}
    result = mycol.find(condition)
    return result


def hassub_writetofile(result,magfile):
    global count
    for j in result:
        try:
            if new_selectmag(j['magnets']):
                bestmag = new_selectmag(j['magnets'])
                magfile.write(bestmag + "\n")
                count = count + 1
                if count == 20:
                    magfile.write("\n\n\n\n\n")
                    count = 0
        except KeyError:
            pass
        except TypeError:
            pass
    magfile.write("\n")

def writetofile(result,magfile):
    global count
    for j in result:
        try:
            bestmag = selectmag(j['magnets'])
            magfile.write(bestmag + "\n")
            count = count + 1
            if count == 20:
                magfile.write("\n\n\n\n\n")
                count = 0
        except KeyError:
            pass
        except TypeError:
            magfile.write((j['magnets'][0]) + "\n")
            count = count + 1
            if count == 20:
                magfile.write("\n\n\n\n\n")
                count = 0
    magfile.write("\n")

def is_alphabet(uchar):
    if (uchar >= u'\u0041' and uchar <= u'\u005a') or (uchar >= u'\u0061' and uchar <= u'\u007a'):
        return True
    else:
        return False

def is_number(uchar):
    if uchar >= u'\u0030' and uchar <= u'\u0039':
        return True
    else:
        return False

def findmag(kind):
    magfile.write(load_dict[kind][j] + ":\n\n")
    if kind == 'title':
        result = findintitle(load_dict[kind][j])
        if options.only_chn_sub == 1:
            hassub_writetofile(result, magfile)
        else:
            writetofile(result, magfile)
    elif kind == 'actress':
        result = findactress(load_dict[kind][j])
        if options.only_chn_sub == 1:
            hassub_writetofile(result, magfile)
        else:
            writetofile(result, magfile)
    elif kind == 'series':
        result = findseries(load_dict[kind][j])
        if options.only_chn_sub == 1:
            hassub_writetofile(result, magfile)
        else:
            writetofile(result, magfile)
    elif kind == 'fanhao':
        fanhao = ""
        if len(load_dict[kind][j].split('-'))<=1:
            for k in range(len(load_dict[kind][j])):
                if k>0 and is_number(load_dict[kind][j][k]):
                    if is_alphabet(load_dict[kind][j][k-1]):
                        fanhao = fanhao + "-"
                fanhao = fanhao + load_dict[kind][j][k]
        else:
            fanhao = load_dict[kind][j]
        col = fanhao.split('-')
        if len(load_dict[kind][j].split(' '))>1:
            item = [col[0]+'-'+var for var in col[1].split(' ')]
            for code in item:
                result = findfanhao(code.upper())
                if options.only_chn_sub==0:
                    writetofile(result, magfile)
                else:
                    hassub_writetofile(result, magfile)
        else:
            result = findfanhao(fanhao.upper())
            if options.only_chn_sub == 0:
                writetofile(result, magfile)
            else:
                hassub_writetofile(result, magfile)




# def findmag():
#     magfile.write(list1[i] + ":\n\n")
#     if (is_alphabet(list1[i][0]) or is_number(list1[i][0])):
#         if len(list1[i].split('-'))>1:
#             col = list1[i].split('-')
#             if len(list1[i].split(' '))>1:
#                 item = [col[0]+'-'+var for var in col[1].split(' ')]
#                 # print(item)
#                 for code in item:
#                     result = findfanhao(mycol, code.upper())
#                     if options.only_chn_sub==0:
#                         writetofile(result, magfile)
#                     else:
#                         hassub_writetofile(result, magfile)
#             else:
#                 result = findfanhao(mycol, list1[i].upper())
#                 if options.only_chn_sub == 0:
#                     writetofile(result, magfile)
#                 else:
#                     hassub_writetofile(result, magfile)
#         else:
#             result = findseries(mycol, list1[i])
#             if options.only_chn_sub == 1:
#                 hassub_writetofile(result, magfile)
#             else:
#                 writetofile(result, magfile)
#     # is_title设置为1时查询所有题目中包含非数字和字母的数据
#     elif options.is_title == 1:
#         result = findintitle(mycol, list1[i])
#         if options.only_chn_sub == 1:
#             hassub_writetofile(result, magfile)
#         else:
#             writetofile(result, magfile)
#     else:
#         result = findactress(mycol, list1[i])
#         if options.only_chn_sub == 1:
#             hassub_writetofile(result, magfile)
#         else:
#             writetofile(result, magfile)

if __name__ == '__main__':
    myclient = pymongo.MongoClient("mongodb://localhost:27017/")
    mydb = myclient["javbus"]
    mycol = mydb["fanhao"]
    usage = "Usage: %prog [options] arg1 arg2 ..."
    parser = OptionParser(usage)
    parser.add_option("-f", "--file", dest='file',type='string')
    parser.add_option("-c", "--chn", dest='only_chn_sub',type='int',default=1)
    parser.add_option("-o", "--output", dest='output',type='string',default="result")
    (options, args) = parser.parse_args()
    # with open("./pmv","r") as f:
    with open(options.file, "r") as f:
        # list1 = f.readlines()
        load_dict = json.load(f)
        with open(options.output + ".txt", "w") as magfile:
            for i in load_dict.keys():
                for j in range(len(load_dict[i])):
                    findmag(i)
    # if options.only_chn_sub==1:
    #     if options.is_title ==0:
    #         with open(options.output+"_chn.txt", "w") as magfile:
    #             for i in range(len(list1)):
    #                 findmag()
    #     else:
    #         with open(options.output+"_key_chn.txt", "w") as magfile:
    #             for i in range(len(list1)):
    #                 findmag()
    # else:
    #     with open(options.output+"_all.txt", "w") as magfile:
    #         for i in range(len(list1)):
    #             findmag()


# avop-061
# avop-245
# wanz-589
# jufd-948
# jufd-999
# love-346
# mism-091
# milk-023
# miad-834
# mvbd-078 102 116 122 142
# migd 472 526
# sdmt-700 285
# mvsd-164 208 215 216 218 228 229 231 237 242 244 249 252 253 257 259 282 283 314 332 344 358 371
# rct-160
# svdvd-053 086 095
# jukd-525
# stc-027
