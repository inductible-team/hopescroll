import { NextRequest, NextResponse } from 'next/server';
import xml2js from 'xml2js';
import { seedFeeds } from '@/lib/db';

interface OpmlNode {
  $?: {
    xmlUrl?: string;
    [key: string]: string | undefined;
  };
  outline?: OpmlNode | OpmlNode[];
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const secret = formData.get('secret');
    const file = formData.get('file') as File;

    if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized: Invalid secret key' }, { status: 401 });
    }

    if (!file) {
      return NextResponse.json({ error: 'No OPML file provided' }, { status: 400 });
    }

    let xmlContent = await file.text();
    // Fix unescaped ampersands that commonly break XML parsing
    xmlContent = xmlContent.replace(/&(?!(?:[a-zA-Z]+|#[0-9]+|#x[0-9a-fA-F]+);)/g, '&amp;');
    
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(xmlContent);

    const urls: string[] = [];

    // Helper to recursively find outlines
    const extractUrls = (node: OpmlNode | OpmlNode[] | null | undefined) => {
      if (!node) return;
      
      if (Array.isArray(node)) {
        node.forEach(extractUrls);
      } else if (typeof node === 'object') {
        if (node.$ && node.$.xmlUrl) {
          urls.push(node.$.xmlUrl);
        }
        // Outline tags can be nested
        if (node.outline) {
          extractUrls(node.outline);
        }
      }
    };

    if (result.opml && result.opml.body && result.opml.body[0] && result.opml.body[0].outline) {
      extractUrls(result.opml.body[0].outline);
    }

    if (urls.length === 0) {
      return NextResponse.json({ error: 'No valid rss/xmlUrl feeds found in the OPML file.' }, { status: 400 });
    }

    // Seed the discovered feeds into the DB (automatically deduplicates)
    const insertedCount = await seedFeeds(urls) || 0;

    return NextResponse.json({ success: true, message: `Successfully parsed OPML. Added ${insertedCount} new feeds (skipped duplicates).` });

  } catch (error: any) {
    console.error('Error processing OPML:', error);
    return NextResponse.json({ error: 'Internal Server Error processing OPML' }, { status: 500 });
  }
}
