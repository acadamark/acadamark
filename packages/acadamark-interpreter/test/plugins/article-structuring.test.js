import assert from 'node:assert/strict';
import { acadamarkArticleStructuring } from '../../src/plugins/article-structuring.js';
import { makeTag } from '../../src/lib/ast-helpers.js';

function para(value) {
  return { type: 'paragraph', children: [{ type: 'text', value }] };
}

function metaTag(type, children = []) {
  return makeTag('meta', children, { kwargs: type ? { type } : {} });
}

export function run() {
  // --- no meta, no sections → implicit article with empty front ---
  {
    const p = para('Some text.');
    const tree = { type: 'root', children: [p] };
    acadamarkArticleStructuring()(tree);

    assert.equal(tree.children.length, 1);
    const article = tree.children[0];
    assert.equal(article.tagname, 'article', 'root should be article');
    const [front, body, back] = article.content;
    assert.equal(front.tagname, 'article-front');
    assert.equal(front.content.length, 0, 'no meta → empty front');
    assert.equal(body.tagname, 'article-body');
    assert.equal(body.content[0], p);
    assert.equal(back.tagname, 'article-back');
    console.log('PASS: article-structuring wraps doc with no meta');
  }

  // --- meta type=article → article with meta in front ---
  {
    const meta = metaTag('article');
    const s = makeTag('section', [para('Intro')]);
    const tree = { type: 'root', children: [meta, s] };
    acadamarkArticleStructuring()(tree);

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
    acadamarkArticleStructuring()(tree);

    assert.equal(titleTag.tagname, 'article-title', 'title promoted in place');
    assert.equal(authorTag.tagname, 'author', 'author unchanged');
    console.log('PASS: article-structuring promotes <title> to <article-title>');
  }

  // --- subtitle promotion: <subtitle> → <article-subtitle> ---
  {
    const subTag = makeTag('subtitle', [para('A Subtitle')]);
    const meta = makeTag('meta', [subTag], { kwargs: { type: 'article' } });
    const tree = { type: 'root', children: [meta] };
    acadamarkArticleStructuring()(tree);

    assert.equal(subTag.tagname, 'article-subtitle');
    console.log('PASS: article-structuring promotes <subtitle> to <article-subtitle>');
  }

  // --- back matter goes to article-back ---
  {
    const meta = metaTag('article');
    const config = makeTag('config', [], { kwargs: { numbering: 'arabic' } });
    const s = makeTag('section', [para('Intro')]);
    const tree = { type: 'root', children: [meta, s, config] };
    acadamarkArticleStructuring()(tree);

    const article = tree.children[0];
    const back = article.content[2];
    assert.equal(back.tagname, 'article-back');
    assert.equal(back.content[0], config, 'config in back-matter');
    assert.equal(article.content[1].content[0], s, 'section in body');
    console.log('PASS: article-structuring routes back-matter correctly');
  }

  // --- book type is skipped ---
  {
    const meta = metaTag('book');
    const tree = { type: 'root', children: [meta, para('body')] };
    acadamarkArticleStructuring()(tree);

    // Tree should be unchanged (book structuring not implemented here).
    assert.equal(tree.children[0], meta, 'book type: tree unchanged');
    console.log('PASS: article-structuring skips meta type=book');
  }

  // --- no meta → default article-shaped treatment ---
  {
    const s = makeTag('section', [para('Intro')]);
    const p2 = para('Paragraph outside section.');
    const tree = { type: 'root', children: [s, p2] };
    acadamarkArticleStructuring()(tree);

    const article = tree.children[0];
    assert.equal(article.tagname, 'article');
    const body = article.content[1];
    assert.equal(body.content[0], s);
    assert.equal(body.content[1], p2);
    console.log('PASS: article-structuring with no meta → default article treatment');
  }
}
