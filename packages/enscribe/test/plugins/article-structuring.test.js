import assert from 'node:assert/strict';
import { enscribeArticleStructuring } from '../../src/interpreter/plugins/article-structuring.js';
import { makeTag } from '../../src/core/tag.js';
import { ENSCRIBE_DOC_TYPE } from '../../src/core/file-data-keys.js';

// The document class is resolved upstream (enscribeDocTypeResolve → file.data) and
// article-structuring reads it from file.data, not from <meta type>. A file-like stand-in.
const docTypeFile = (docType) => ({ data: { [ENSCRIBE_DOC_TYPE]: docType } });

function para(value) {
  return { type: 'paragraph', children: [{ type: 'text', value }] };
}

function metaTag(type, children = []) {
  return makeTag('meta', children, { kwargs: type ? { type } : {} });
}

export function run() {
  // --- no meta, no sections → implicit article with only body (empty regions suppressed) ---
  {
    const p = para('Some text.');
    const tree = { type: 'root', children: [p] };
    enscribeArticleStructuring()(tree);

    assert.equal(tree.children.length, 1);
    const article = tree.children[0];
    assert.equal(article.tagname, 'article', 'root should be article');
    // No meta → article-front is empty and suppressed.
    // No back-matter → article-back is empty and suppressed.
    assert.equal(article.content.length, 1, 'only body region emitted');
    const [body] = article.content;
    assert.equal(body.tagname, 'article-body');
    assert.equal(body.content[0], p);
    console.log('PASS: article-structuring wraps doc with no meta');
  }

  // --- meta type=article → article with meta in front ---
  {
    const meta = metaTag('article');
    const s = makeTag('section', [para('Intro')]);
    const tree = { type: 'root', children: [meta, s] };
    enscribeArticleStructuring()(tree);

    const article = tree.children[0];
    assert.equal(article.tagname, 'article');
    const [front, body] = article.content;
    assert.equal(front.content[0], meta, 'meta should be in front');
    assert.equal(body.content[0], s, 'section should be in body');
    console.log('PASS: article-structuring with meta type=article');
  }

  // --- title promotion: <title> → <article-title> ---
  {
    const titleTag = makeTag('title', [para('My Paper')]);
    const authorTag = makeTag('author', [para('Jane')]);
    const meta = makeTag('meta', [titleTag, authorTag], { kwargs: { type: 'article' } });
    const tree = { type: 'root', children: [meta] };
    enscribeArticleStructuring()(tree);

    assert.equal(titleTag.tagname, 'article-title', 'title promoted in place');
    assert.equal(authorTag.tagname, 'author', 'author unchanged');
    console.log('PASS: article-structuring promotes <title> to <article-title>');
  }

  // --- subtitle promotion: <subtitle> → <article-subtitle> ---
  {
    const subTag = makeTag('subtitle', [para('A Subtitle')]);
    const meta = makeTag('meta', [subTag], { kwargs: { type: 'article' } });
    const tree = { type: 'root', children: [meta] };
    enscribeArticleStructuring()(tree);

    assert.equal(subTag.tagname, 'article-subtitle');
    console.log('PASS: article-structuring promotes <subtitle> to <article-subtitle>');
  }

  // --- back matter goes to article-back ---
  {
    const meta = metaTag('article');
    const config = makeTag('config', [], { kwargs: { numbering: 'arabic' } });
    const s = makeTag('section', [para('Intro')]);
    const tree = { type: 'root', children: [meta, s, config] };
    enscribeArticleStructuring()(tree);

    const article = tree.children[0];
    const back = article.content[2];
    assert.equal(back.tagname, 'article-back');
    assert.equal(back.content[0], config, 'config in back-matter');
    assert.equal(article.content[1].content[0], s, 'section in body');
    console.log('PASS: article-structuring routes back-matter correctly');
  }

  // --- <data> goes to root-level sibling, not article-back ---
  {
    const meta = metaTag('article');
    const s = makeTag('section', [para('Body')]);
    const data = makeTag('data', [makeTag('library')]);
    const tree = { type: 'root', children: [meta, s, data] };
    enscribeArticleStructuring()(tree);

    // tree.children = [article, data]
    assert.equal(tree.children.length, 2, '<data> is a root sibling: two root children');
    const article = tree.children[0];
    const dataSibling = tree.children[1];
    assert.equal(article.tagname, 'article');
    assert.equal(dataSibling, data, '<data> preserved as root sibling');
    // data is NOT inside article-back
    const back = article.content.find(n => n.tagname === 'article-back');
    assert.equal(back, undefined, 'no article-back (data not routed there)');
    console.log('PASS: article-structuring extracts <data> as root sibling');
  }

  // --- book type is skipped ---
  {
    const meta = metaTag('book');
    const tree = { type: 'root', children: [meta, para('body')] };
    enscribeArticleStructuring()(tree, docTypeFile('book'));

    // Tree should be unchanged (book structuring not implemented here).
    assert.equal(tree.children[0], meta, 'book type: tree unchanged');
    console.log('PASS: article-structuring skips meta type=book');
  }

  // --- no meta → default article-shaped treatment ---
  {
    const s = makeTag('section', [para('Intro')]);
    const p2 = para('Paragraph outside section.');
    const tree = { type: 'root', children: [s, p2] };
    enscribeArticleStructuring()(tree);

    const article = tree.children[0];
    assert.equal(article.tagname, 'article');
    // No meta → article-front suppressed. Body is the only/first region.
    const body = article.content[0];
    assert.equal(body.tagname, 'article-body');
    assert.equal(body.content[0], s);
    assert.equal(body.content[1], p2);
    console.log('PASS: article-structuring with no meta → default article treatment');
  }
}
