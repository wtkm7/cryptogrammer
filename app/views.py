import re
import random
import sys
import copy

from flask import Flask, url_for, request, render_template, redirect, jsonify
import requests

from app import app

WIKIPEDIA_EXTRACT_URL = 'https://%s.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&redirects=1&exintro=&explaintext=&titles=%s'
SITE_TITLE = 'Cryptogrammer'
ALPHANUMER_0 = list('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')

cache = {} # poor man's in-memory caching system

class CryptogrammerException(Exception):
    """A generic Exception for Cryptogrammer."""
    
    status_code = 500 # default to 500, Internal Server Error
	
    def __init__(self, status_code, message):
        Exception.__init__(self)
        if status_code is not None:
            self.status_code = status_code
        self.message = message
	
    def to_dict(self):
        d = {}
        d['message'] = self.message
        return d

class PageNotFoundException(CryptogrammerException):
    """
    This is the exception raised when a Wikipedia article corresponding to
    a search phrase cannot be found in Wikipedia.
    """

    def __init__(self, message):
        CryptogrammerException.__init__(self, 404, message)
        print message


class UnexpectedStatusCodeException(CryptogrammerException):
    """
    This is the exception raised when Wikipedia responds with any status code
    other than 200. 
    """
    
    def __init__(self, message):
        CryptogrammerException.__init__(self, 500, message)
        print message


class NoSuitableSentenceException(CryptogrammerException):
    """
    This is the exception raised when the Wikipedia extract corresponding to a
    given topic does not include a suitable sentence.
    """
    
    def __init__(self, message):
        CryptogrammerException.__init__(self, 404, message)
        print message


def do_cached_get_request(u):
    u = u.lower()
    if not u in cache:
        print 'looking for '+u
        cache[u] = requests.get(u)
    return cache[u]

def page_not_found(r):
    """
    Returns True if a page corresponding to the search phrase was not found
    """
    pages = r.json()['query']['pages']
    pageid = pages.keys()[0]
    return pageid == '-1'


def get_text(r):
    """
    Given a response from the Wikipedia endpoint, returns the text of the
    Wikipedia article extract
    """
    pages = r.json()['query']['pages']
    pageid = pages.keys()[0]
    return pages[pageid]['extract']


def get_wikipedia_extract_wrapper(searchphrase, lang = None):
    """If possible, returns the text of the Wikipedia article extract"""

    def do_get_wikipedia_extract(searchphrase, lang = None):
        if lang == None:
            lang = 'en'
        url = WIKIPEDIA_EXTRACT_URL % (lang, searchphrase)
        r = do_cached_get_request(url)
        if not r.status_code == 200:
            raise UnexpectedStatusCodeException('Received an HTTP %d response code!')
        else:
            return r
    
    try:
        r = do_get_wikipedia_extract(searchphrase, lang = lang)
        if page_not_found(r):
            raise PageNotFoundException('Could not find "%s" in Wikipedia (%s). Please try another topic.' % (searchphrase, lang) )
        else:
            return get_text(r)
    except PageNotFoundException as e:
        """
        If the term wasn't found after searching a non-English Wikipedia,
        check the English Wikipedia
        """
        if lang is not 'en':
            return get_wikipedia_extract_wrapper(searchphrase, lang = 'en')
        else:
            raise e


def get_cleaned_text(t):
    t = re.sub('\^.*', '', t) # remove lines that begin with carets
    t = re.sub(r'\(.*\) ', '', t) # remove text in parens
    return t


def get_line(searchphrase):
    """Given a search phrase, returns a single line of related text"""
    
    rawtext = get_wikipedia_extract_wrapper(searchphrase, lang='simple')
    cleantext = get_cleaned_text( rawtext )
    lines = cleantext.upper()
    lines = re.split(r'\.( |\n)+', lines)
    
    # remove blanks and very short sentences
    lines = [l for l in lines if len(l)>30]
    
    if len(lines)<1:
        raise NoSuitableSentenceException('Could not find a suitable sentence for %s.' % searchphrase)
    
    l = random.choice(lines)
    
    # replace everything outside of A-z, 0-9
    l = re.sub(r'[^A-Za-z0-9 ]', '', l)
    
    return l


def get_cryptogram(line):
    """Creates a random substitution cipher and applies it to the line"""
    
    ALPHANUMER_1 = copy.deepcopy(ALPHANUMER_0)
    random.shuffle(ALPHANUMER_1)
    mapper = dict(zip(ALPHANUMER_0,ALPHANUMER_1))
    
    # add space and let it map to itself
    mapper[' '] = ' '
    
    # concat everything back together and return
    return ''.join([mapper[l] for l in line]) 


@app.route('/', methods=['GET'])
def index():
    """Returns the view for the index page"""

    return render_template('cryptogram.html', title = SITE_TITLE )    
   

@app.route('/cryptogram/<path:searchphrase>', methods=['GET'])
def cryptogram(searchphrase):
    try:
        solution=get_line(searchphrase)
        cryptogram = get_cryptogram(solution)
        d = {}
        d['message'] = 'OK'
        d['cryptogram'] = cryptogram
        d['solution'] = solution
        d['searchphrase'] = searchphrase
        return jsonify(d)

    except CryptogrammerException as e:
        # something went wrong!
        response = jsonify(e.to_dict())
        response.status_code = e.status_code
        return response

    except Exception as e:
        # something unknown went wrong!
        d = {}
        d['message'] = 'Could not generate cryptogram. Please try again.'
        response = jsonify(d)
        response.status_code = 500
        return response

